import { env, pipeline } from "@huggingface/transformers";
import {
  DEFAULT_MAX_CANDIDATES,
  WASM_CONTEXT_MODEL_DTYPE,
  WASM_CONTEXT_MODEL_ID,
  WASM_CONTEXT_MODEL_REVISION
} from "./constants";
import { classifyLlmError, sanitizeLlmErrorDetail } from "./errors";
import { mergeResidualContextCandidates } from "./residualMasking";
import type {
  AnalyzeContextOptions,
  ContextAnalysisResult,
  LlmContextAnalyzer,
  LlmProgress
} from "./types";
import {
  createWasmContextCandidates,
  getWasmContextPrototypeTexts,
  splitWasmContextSegments,
  WASM_CONTEXT_ANALYZING_MESSAGE,
  WASM_CONTEXT_LOADING_MESSAGE,
  type WasmContextAnalyzerOptions,
  type WasmContextEmbeddingRuntime
} from "./wasmClassifier";

const WASM_CONTEXT_ERROR_MESSAGE =
  "CPUによる文脈チェックを実行できませんでした。ルールベースの検出結果は引き続き利用できます。";
const WASM_CONTEXT_ERROR_HINT =
  "モデル取得先への接続、ブラウザの保存領域、端末のメモリを確認してください。";

function configureWasmBackend(wasmRootUrl: string): void {
  env.allowLocalModels = false;
  env.allowRemoteModels = true;
  env.useBrowserCache = true;
  const wasmBackend = env.backends.onnx.wasm;
  if (!wasmBackend) {
    throw new Error("CPU文脈チェック用のWASM実行環境を初期化できませんでした。");
  }
  wasmBackend.wasmPaths = wasmRootUrl;
  wasmBackend.proxy = false;
  wasmBackend.numThreads = 1;
}

function createLoadingProgress(progressValue?: number): LlmProgress {
  return {
    phase: "loading",
    message: WASM_CONTEXT_LOADING_MESSAGE,
    ...(typeof progressValue === "number" ? { progress: progressValue } : {})
  };
}

function toNumberMatrix(value: unknown): number[][] {
  if (!Array.isArray(value)) {
    throw new Error("埋め込みモデルの出力形式が正しくありません。");
  }

  if (value.every((item) => typeof item === "number")) {
    return [value];
  }

  if (
    value.every(
      (row) => Array.isArray(row) && row.every((item) => typeof item === "number")
    )
  ) {
    return value;
  }

  throw new Error("埋め込みモデルの出力形式が正しくありません。");
}

async function loadFeatureExtractor(onProgress?: (progress: LlmProgress) => void) {
  return pipeline("feature-extraction", WASM_CONTEXT_MODEL_ID, {
    device: "wasm",
    dtype: WASM_CONTEXT_MODEL_DTYPE,
    revision: WASM_CONTEXT_MODEL_REVISION,
    progress_callback: (progress) => {
      const progressValue = progress.status === "progress" ? progress.progress / 100 : undefined;
      onProgress?.(createLoadingProgress(progressValue));
    }
  });
}

type FeatureExtractor = Awaited<ReturnType<typeof loadFeatureExtractor>>;

function createEmbeddingRuntime(wasmRootUrl: string): WasmContextEmbeddingRuntime {
  configureWasmBackend(wasmRootUrl);
  let extractorPromise: Promise<FeatureExtractor> | null = null;

  const getExtractor = (onProgress?: (progress: LlmProgress) => void): Promise<FeatureExtractor> => {
    extractorPromise ??= loadFeatureExtractor(onProgress).catch((error) => {
      extractorPromise = null;
      throw error;
    });
    return extractorPromise;
  };

  return {
    async embed(texts, onProgress) {
      const extractor = await getExtractor(onProgress);
      const output = await extractor([...texts], {
        pooling: "mean",
        normalize: true
      });
      const list: unknown = output.tolist();
      return toNumberMatrix(list);
    },
    async dispose() {
      const extractor = await extractorPromise;
      extractorPromise = null;
      await extractor?.dispose();
    }
  };
}

export function createWasmContextAnalyzer(
  options: WasmContextAnalyzerOptions
): LlmContextAnalyzer {
  const runtime = createEmbeddingRuntime(options.wasmRootUrl);
  let prototypeEmbeddingsPromise: Promise<number[][]> | null = null;
  let ready = false;
  let disposed = false;

  const prepare = async (onProgress?: (progress: LlmProgress) => void): Promise<void> => {
    if (disposed) {
      throw new Error("CPU文脈チェックは既に破棄されています。");
    }
    if (ready) {
      return;
    }

    onProgress?.(createLoadingProgress());
    prototypeEmbeddingsPromise ??= runtime
      .embed(getWasmContextPrototypeTexts(), onProgress)
      .catch((error) => {
        prototypeEmbeddingsPromise = null;
        throw error;
      });
    await prototypeEmbeddingsPromise;
    ready = true;
  };

  return {
    prepare,
    async analyze(input, analyzeOptions: AnalyzeContextOptions = {}) {
      const startedAt = performance.now();
      const maxCandidates = Math.min(
        analyzeOptions.maxCandidates ?? options.maxCandidates ?? DEFAULT_MAX_CANDIDATES,
        DEFAULT_MAX_CANDIDATES
      );

      try {
        await prepare(analyzeOptions.onProgress);
        analyzeOptions.onProgress?.({
          phase: "analyzing",
          message: WASM_CONTEXT_ANALYZING_MESSAGE
        });

        const segments = splitWasmContextSegments(input, {
          ...(typeof options.maxInputChars === "number"
            ? { maxInputChars: options.maxInputChars }
            : {}),
          ...(typeof options.maxSegments === "number" ? { maxSegments: options.maxSegments } : {})
        });
        const prototypeEmbeddings = await prototypeEmbeddingsPromise;
        if (!prototypeEmbeddings) {
          throw new Error("CPU文脈チェック用の基準データを準備できませんでした。");
        }

        const segmentEmbeddings =
          segments.length > 0
            ? await runtime.embed(
                segments.map((segment) => `passage: ${segment.surface}`),
                analyzeOptions.onProgress
              )
            : [];
        const candidates = createWasmContextCandidates({
          input,
          segments,
          segmentEmbeddings,
          prototypeEmbeddings,
          maxCandidates,
          ...(typeof options.confidenceThreshold === "number"
            ? { confidenceThreshold: options.confidenceThreshold }
            : {})
        });

        analyzeOptions.onProgress?.({
          phase: "done",
          message: "CPUによる文脈チェックが完了しました。"
        });
        return {
          candidates,
          summary:
            candidates.length > 0
              ? "CPUによる文脈チェックで注意候補が見つかりました。"
              : "CPUによる文脈チェックでは追加の注意候補は見つかりませんでした。安全を保証するものではありません。",
          rawText: "",
          modelId: WASM_CONTEXT_MODEL_ID,
          elapsedMs: performance.now() - startedAt
        } satisfies ContextAnalysisResult;
      } catch (error: unknown) {
        const classified = classifyLlmError(error);
        const errorDetail = sanitizeLlmErrorDetail(
          {
            kind: "wasm",
            message: WASM_CONTEXT_ERROR_MESSAGE,
            hint: WASM_CONTEXT_ERROR_HINT,
            ...(classified.technicalDetail
              ? { technicalDetail: classified.technicalDetail }
              : {})
          },
          input
        );
        return {
          candidates: mergeResidualContextCandidates(input, [], { maxCandidates }),
          summary: WASM_CONTEXT_ERROR_MESSAGE,
          rawText: "",
          modelId: WASM_CONTEXT_MODEL_ID,
          elapsedMs: performance.now() - startedAt,
          error: WASM_CONTEXT_ERROR_MESSAGE,
          errorDetail
        } satisfies ContextAnalysisResult;
      }
    },
    isReady() {
      return ready && !disposed;
    },
    async dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      ready = false;
      prototypeEmbeddingsPromise = null;
      await runtime.dispose();
    }
  };
}
