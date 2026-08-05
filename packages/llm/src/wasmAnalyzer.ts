import {
  DEFAULT_MAX_CANDIDATES,
  DEFAULT_MAX_INPUT_CHARS,
  LOCAL_CONTEXT_MODEL_ID,
  LOCAL_NER_MODEL_ID
} from "./constants";
import { classifyLlmError, sanitizeLlmErrorDetail } from "./errors";
import { createNerContextCandidates } from "./nerClassifier";
import { mergeResidualContextCandidates } from "./residualMasking";
import type {
  AnalyzeContextOptions,
  ContextAnalysisResult,
  ContextRiskCandidate,
  LlmContextAnalyzer,
  LlmErrorDetail,
  LlmProgress
} from "./types";
import {
  createWasmContextCandidates,
  getWasmContextPrototypeTexts,
  splitWasmContextSegments,
  WASM_CONTEXT_ANALYZING_MESSAGE,
  type WasmContextAnalyzerOptions
} from "./wasmClassifier";
import { createLocalAiRuntime, createWasmLoadingProgress } from "./wasmRuntime";

const LOCAL_AI_ERROR_MESSAGE =
  "ブラウザ内のAI文脈チェックを実行できませんでした。ルールベースの検出結果は引き続き利用できます。";

function createStageError(error: unknown, input: string, stage: "文脈分類" | "固有表現抽出"): LlmErrorDetail {
  const classified = classifyLlmError(error);
  return sanitizeLlmErrorDetail(
    {
      kind: classified.kind,
      message: `${stage}を実行できませんでした。`,
      hint: classified.hint,
      ...(classified.technicalDetail ? { technicalDetail: classified.technicalDetail } : {})
    },
    input
  );
}

function uniqueCandidates(candidates: ContextRiskCandidate[], maxCandidates: number): ContextRiskCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.category}:${candidate.start ?? ""}:${candidate.end ?? ""}:${candidate.surface}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  }).slice(0, maxCandidates);
}

export function createWasmContextAnalyzer(options: WasmContextAnalyzerOptions): LlmContextAnalyzer {
  const runtime = createLocalAiRuntime(options.wasmRootUrl);
  let prototypeEmbeddings: number[][] | null = null;
  let contextReady = false;
  let nerReady = false;
  let ready = false;
  let disposed = false;

  const prepare = async (onProgress?: (progress: LlmProgress) => void): Promise<void> => {
    if (disposed) {
      throw new Error("AI文脈チェックは既に破棄されています。");
    }
    if (ready) {
      return;
    }

    onProgress?.(createWasmLoadingProgress());
    const [contextResult, nerResult] = await Promise.allSettled([
      runtime.embed(getWasmContextPrototypeTexts(), onProgress),
      runtime.prepareNer(onProgress)
    ]);
    if (contextResult.status === "fulfilled") {
      prototypeEmbeddings = contextResult.value;
      contextReady = true;
    }
    if (nerResult.status === "fulfilled") {
      nerReady = true;
    }
    if (!contextReady && !nerReady) {
      throw contextResult.status === "rejected" ? contextResult.reason : nerResult.status === "rejected" ? nerResult.reason : new Error(LOCAL_AI_ERROR_MESSAGE);
    }
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
      const warnings: LlmErrorDetail[] = [];

      try {
        await prepare(analyzeOptions.onProgress);
        if (analyzeOptions.signal?.aborted) {
          throw new DOMException("AI文脈チェックを中止しました。", "AbortError");
        }
        analyzeOptions.onProgress?.({ phase: "analyzing", message: WASM_CONTEXT_ANALYZING_MESSAGE });

        const limitedInput = input.slice(0, options.maxInputChars ?? DEFAULT_MAX_INPUT_CHARS);
        const modelCandidates: ContextRiskCandidate[] = [];

        if (nerReady) {
          try {
            const tokens = await runtime.extractEntities(limitedInput, analyzeOptions.onProgress);
            modelCandidates.push(...createNerContextCandidates(limitedInput, tokens, { maxCandidates }));
          } catch (error: unknown) {
            nerReady = false;
            warnings.push(createStageError(error, input, "固有表現抽出"));
          }
        } else {
          warnings.push(createStageError(new Error("固有表現抽出モデルを準備できませんでした。"), input, "固有表現抽出"));
        }

        if (contextReady && prototypeEmbeddings) {
          try {
            const segments = splitWasmContextSegments(limitedInput, {
              ...(typeof options.maxInputChars === "number" ? { maxInputChars: options.maxInputChars } : {}),
              ...(typeof options.maxSegments === "number" ? { maxSegments: options.maxSegments } : {})
            });
            const segmentEmbeddings = segments.length > 0
              ? await runtime.embed(
                  segments.map((segment) => `トピック: ${segment.surface}`),
                  analyzeOptions.onProgress
                )
              : [];
            modelCandidates.push(...createWasmContextCandidates({
              input: limitedInput,
              segments,
              segmentEmbeddings,
              prototypeEmbeddings,
              maxCandidates,
              includeResidualCandidates: false,
              ...(typeof options.confidenceThreshold === "number"
                ? { confidenceThreshold: options.confidenceThreshold }
                : {})
            }));
          } catch (error: unknown) {
            contextReady = false;
            warnings.push(createStageError(error, input, "文脈分類"));
          }
        } else {
          warnings.push(createStageError(new Error("文脈分類モデルを準備できませんでした。"), input, "文脈分類"));
        }

        const candidates = mergeResidualContextCandidates(
          limitedInput,
          uniqueCandidates(modelCandidates, maxCandidates),
          { maxCandidates }
        );
        const bothModelsFailed = !contextReady && !nerReady;
        if (bothModelsFailed) {
          throw new Error(LOCAL_AI_ERROR_MESSAGE);
        }

        analyzeOptions.onProgress?.({ phase: "done", message: "ブラウザ内のAI文脈チェックが完了しました。" });
        return {
          candidates,
          summary: warnings.length > 0
            ? "一部のモデルは利用できませんでしたが、ブラウザ内のAI文脈チェックで注意候補を確認しました。"
            : candidates.length > 0
              ? "ブラウザ内のAI文脈チェックで注意候補が見つかりました。"
              : "ブラウザ内のAI文脈チェックでは追加の注意候補は見つかりませんでした。安全を保証するものではありません。",
          rawText: "",
          modelId: LOCAL_CONTEXT_MODEL_ID,
          modelIds: [LOCAL_CONTEXT_MODEL_ID, LOCAL_NER_MODEL_ID],
          elapsedMs: performance.now() - startedAt,
          ...(warnings.length > 0 ? { warnings } : {})
        } satisfies ContextAnalysisResult;
      } catch (error: unknown) {
        const classified = classifyLlmError(error);
        const errorDetail = sanitizeLlmErrorDetail(classified, input);
        return {
          candidates: mergeResidualContextCandidates(input, [], { maxCandidates }),
          summary: LOCAL_AI_ERROR_MESSAGE,
          rawText: "",
          modelId: LOCAL_CONTEXT_MODEL_ID,
          modelIds: [LOCAL_CONTEXT_MODEL_ID, LOCAL_NER_MODEL_ID],
          elapsedMs: performance.now() - startedAt,
          error: LOCAL_AI_ERROR_MESSAGE,
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
      contextReady = false;
      nerReady = false;
      prototypeEmbeddings = null;
      await runtime.dispose();
    }
  };
}
