import {
  ANALYZING_MESSAGE,
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_MAX_INPUT_CHARS,
  DEFAULT_MODEL_ID,
  MODEL_LOADING_MESSAGE,
  WEBGPU_UNAVAILABLE_MESSAGE
} from "./constants";
import { classifyLlmError } from "./errors";
import { isWebGpuAvailable } from "./webgpu";
import type { AnalyzeContextOptions, ContextAnalysisResult, LlmAnalyzerOptions, LlmContextAnalyzer, LlmErrorDetail, LlmProgress } from "./types";

type WorkerSuccessMessage = {
  type: "result";
  requestId: string;
  result: ContextAnalysisResult;
};

type WorkerProgressMessage = {
  type: "progress";
  requestId: string;
  progress: LlmProgress;
};

type WorkerErrorMessage = {
  type: "error";
  requestId: string;
  error: string;
  errorDetail?: LlmErrorDetail;
  modelId: string;
  elapsedMs: number;
};

type WorkerResponse = WorkerSuccessMessage | WorkerProgressMessage | WorkerErrorMessage;

type NormalizedLlmAnalyzerOptions = Required<Omit<LlmAnalyzerOptions, "workerUrl">> & {
  workerUrl?: string;
};

function isWorkerResponse(value: unknown): value is WorkerResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.type === "string" && typeof record.requestId === "string";
}

function createErrorResult(inputModelId: string, startedAt: number, error: string, errorDetail?: LlmErrorDetail): ContextAnalysisResult {
  return {
    candidates: [],
    summary: error,
    rawText: "",
    modelId: inputModelId,
    elapsedMs: Math.max(0, performance.now() - startedAt),
    error,
    ...(errorDetail ? { errorDetail } : {})
  };
}

class WorkerLlmContextAnalyzer implements LlmContextAnalyzer {
  private worker: Worker | null = null;

  constructor(private readonly options: NormalizedLlmAnalyzerOptions) {}

  async analyze(input: string, options: AnalyzeContextOptions = {}): Promise<ContextAnalysisResult> {
    const startedAt = performance.now();

    if (!isWebGpuAvailable()) {
      return createErrorResult(this.options.modelId, startedAt, WEBGPU_UNAVAILABLE_MESSAGE);
    }

    if (typeof Worker === "undefined") {
      return createErrorResult(this.options.modelId, startedAt, WEBGPU_UNAVAILABLE_MESSAGE);
    }

    if (options.signal?.aborted) {
      return createErrorResult(this.options.modelId, startedAt, "AI文脈チェックが中断されました。");
    }

    options.onProgress?.({ phase: "loading", message: MODEL_LOADING_MESSAGE });
    const worker = this.getWorker();
    const requestId = `request-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const inputForModel = input.slice(0, this.options.maxInputChars);

    return new Promise((resolve) => {
      const cleanup = () => {
        worker.removeEventListener("message", handleMessage);
        worker.removeEventListener("error", handleWorkerError);
        worker.removeEventListener("messageerror", handleWorkerMessageError);
        options.signal?.removeEventListener("abort", handleAbort);
      };

      const handleAbort = () => {
        cleanup();
        this.dispose();
        resolve(createErrorResult(this.options.modelId, startedAt, "AI文脈チェックが中断されました。"));
      };

      const handleMessage = (event: MessageEvent<unknown>) => {
        if (!isWorkerResponse(event.data) || event.data.requestId !== requestId) {
          return;
        }

        if (event.data.type === "progress") {
          options.onProgress?.(event.data.progress);
          return;
        }

        cleanup();
        if (event.data.type === "result") {
          resolve(event.data.result);
          return;
        }

        resolve(createErrorResult(event.data.modelId, startedAt, event.data.error, event.data.errorDetail));
      };

      const handleWorkerError = (event: ErrorEvent) => {
        cleanup();
        this.dispose();
        const detail = classifyLlmError(new Error(event.message || "Worker script error"));
        resolve(createErrorResult(this.options.modelId, startedAt, detail.message, detail));
      };

      const handleWorkerMessageError = () => {
        cleanup();
        this.dispose();
        const detail = classifyLlmError(new Error("Worker messageerror"));
        resolve(createErrorResult(this.options.modelId, startedAt, detail.message, detail));
      };

      options.signal?.addEventListener("abort", handleAbort, { once: true });
      worker.addEventListener("message", handleMessage);
      worker.addEventListener("error", handleWorkerError);
      worker.addEventListener("messageerror", handleWorkerMessageError);
      const { workerUrl: _workerUrl, ...analyzerOptions } = this.options;
      worker.postMessage({
        type: "analyze",
        requestId,
        input: inputForModel,
        analyzerOptions,
        analyzeOptions: {
          existingFindings: options.existingFindings ?? [],
          language: options.language ?? "ja",
          maxCandidates: options.maxCandidates ?? 12
        }
      });
      options.onProgress?.({ phase: "analyzing", message: ANALYZING_MESSAGE });
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(this.options.workerUrl ?? new URL("./worker.js", import.meta.url), { type: "module" });
    }

    return this.worker;
  }
}

function normalizeOptions(options: LlmAnalyzerOptions = {}): NormalizedLlmAnalyzerOptions {
  const normalized: NormalizedLlmAnalyzerOptions = {
    modelId: options.modelId ?? DEFAULT_MODEL_ID,
    temperature: options.temperature ?? 0.1,
    maxTokens: options.maxTokens ?? 900,
    maxInputChars: options.maxInputChars ?? DEFAULT_MAX_INPUT_CHARS,
    confidenceThreshold: options.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD
  };

  if (options.workerUrl) {
    normalized.workerUrl = options.workerUrl;
  }

  return normalized;
}

export function createLlmContextAnalyzer(options?: LlmAnalyzerOptions): LlmContextAnalyzer {
  return new WorkerLlmContextAnalyzer(normalizeOptions(options));
}

export async function analyzeContextRisk(input: string, options: AnalyzeContextOptions = {}): Promise<ContextAnalysisResult> {
  const analyzer = createLlmContextAnalyzer();
  try {
    return await analyzer.analyze(input, options);
  } finally {
    analyzer.dispose();
  }
}
