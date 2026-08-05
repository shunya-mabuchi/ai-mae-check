import { env, pipeline } from "@huggingface/transformers";
import {
  LOCAL_CONTEXT_MODEL_DTYPE,
  LOCAL_CONTEXT_MODEL_ID,
  LOCAL_CONTEXT_MODEL_REVISION,
  LOCAL_NER_MODEL_DTYPE,
  LOCAL_NER_MODEL_ID,
  LOCAL_NER_MODEL_REVISION
} from "./constants";
import type { NerToken } from "./nerClassifier";
import type { LlmProgress } from "./types";
import { WASM_CONTEXT_LOADING_MESSAGE } from "./wasmClassifier";

function configureWasmBackend(wasmRootUrl: string): void {
  env.allowLocalModels = false;
  env.allowRemoteModels = true;
  env.useBrowserCache = true;
  const wasmBackend = env.backends.onnx.wasm;
  if (!wasmBackend) {
    throw new Error("AI文脈チェック用のWASM実行環境を初期化できませんでした。");
  }
  wasmBackend.wasmPaths = wasmRootUrl;
  wasmBackend.proxy = false;
  wasmBackend.numThreads = 1;
}

export function createWasmLoadingProgress(progressValue?: number): LlmProgress {
  return {
    phase: "loading",
    message: WASM_CONTEXT_LOADING_MESSAGE,
    ...(typeof progressValue === "number" ? { progress: progressValue } : {})
  };
}

function createProgressCallback(onProgress?: (progress: LlmProgress) => void) {
  return (progress: { status: string; progress?: number }): void => {
    const progressValue =
      progress.status === "progress" && typeof progress.progress === "number"
        ? progress.progress / 100
        : undefined;
    onProgress?.(createWasmLoadingProgress(progressValue));
  };
}

function toNumberMatrix(value: unknown): number[][] {
  if (!Array.isArray(value)) {
    throw new Error("埋め込みモデルの出力形式が正しくありません。");
  }
  if (value.every((item) => typeof item === "number")) {
    return [value];
  }
  if (value.every((row) => Array.isArray(row) && row.every((item) => typeof item === "number"))) {
    return value;
  }
  throw new Error("埋め込みモデルの出力形式が正しくありません。");
}

function toNerTokens(value: unknown): NerToken[] {
  if (!Array.isArray(value)) {
    throw new Error("固有表現抽出モデルの出力形式が正しくありません。");
  }
  return value.flatMap((item): NerToken[] => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const token = item as Partial<NerToken>;
    if (
      typeof token.entity !== "string" ||
      typeof token.score !== "number" ||
      typeof token.word !== "string" ||
      typeof token.index !== "number"
    ) {
      return [];
    }
    return [{
      entity: token.entity,
      score: token.score,
      word: token.word,
      index: token.index,
      ...(typeof token.start === "number" ? { start: token.start } : {}),
      ...(typeof token.end === "number" ? { end: token.end } : {})
    }];
  });
}

async function loadFeatureExtractor(onProgress?: (progress: LlmProgress) => void) {
  return pipeline("feature-extraction", LOCAL_CONTEXT_MODEL_ID, {
    device: "wasm",
    dtype: LOCAL_CONTEXT_MODEL_DTYPE,
    revision: LOCAL_CONTEXT_MODEL_REVISION,
    progress_callback: createProgressCallback(onProgress)
  });
}

async function loadNerExtractor(onProgress?: (progress: LlmProgress) => void) {
  return pipeline("token-classification", LOCAL_NER_MODEL_ID, {
    device: "wasm",
    dtype: LOCAL_NER_MODEL_DTYPE,
    revision: LOCAL_NER_MODEL_REVISION,
    progress_callback: createProgressCallback(onProgress)
  });
}

type FeatureExtractor = Awaited<ReturnType<typeof loadFeatureExtractor>>;
type NerExtractor = Awaited<ReturnType<typeof loadNerExtractor>>;

export function createLocalAiRuntime(wasmRootUrl: string) {
  configureWasmBackend(wasmRootUrl);
  let featureExtractorPromise: Promise<FeatureExtractor> | null = null;
  let nerExtractorPromise: Promise<NerExtractor> | null = null;

  const getFeatureExtractor = (onProgress?: (progress: LlmProgress) => void) => {
    featureExtractorPromise ??= loadFeatureExtractor(onProgress).catch((error) => {
      featureExtractorPromise = null;
      throw error;
    });
    return featureExtractorPromise;
  };
  const getNerExtractor = (onProgress?: (progress: LlmProgress) => void) => {
    nerExtractorPromise ??= loadNerExtractor(onProgress).catch((error) => {
      nerExtractorPromise = null;
      throw error;
    });
    return nerExtractorPromise;
  };

  return {
    async embed(texts: readonly string[], onProgress?: (progress: LlmProgress) => void) {
      const extractor = await getFeatureExtractor(onProgress);
      const output = await extractor([...texts], { pooling: "mean", normalize: true });
      return toNumberMatrix(output.tolist());
    },
    async prepareNer(onProgress?: (progress: LlmProgress) => void) {
      await getNerExtractor(onProgress);
    },
    async extractEntities(input: string, onProgress?: (progress: LlmProgress) => void) {
      const extractor = await getNerExtractor(onProgress);
      const output: unknown = await extractor(input, { ignore_labels: ["O"] });
      return toNerTokens(output);
    },
    async dispose() {
      const featureExtractor = await featureExtractorPromise?.catch(() => undefined);
      const nerExtractor = await nerExtractorPromise?.catch(() => undefined);
      featureExtractorPromise = null;
      nerExtractorPromise = null;
      await Promise.all([featureExtractor?.dispose(), nerExtractor?.dispose()]);
    }
  };
}
