/// <reference path="./vite-env.d.ts" />

import {
  ANALYZING_MESSAGE,
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_MAX_INPUT_CHARS,
  DEFAULT_MODEL_ID,
  MODEL_LOADING_MESSAGE,
  WEBGPU_UNAVAILABLE_MESSAGE
} from "./constants";
import { classifyLlmError } from "./errors";
import { resolveModelId, type WebLlmModelListModule } from "./model";
import { parseContextAnalysisJson } from "./parser";
import { buildContextRiskPrompt } from "./prompt";
import { isWebGpuAvailable } from "./webgpu";
import type { AnalyzeContextOptions, ContextAnalysisResult, LlmAnalyzerOptions, LlmContextAnalyzer, LlmErrorDetail, LlmProgress } from "./types";
import WebLlmWorker from "./webllmWorker?worker";

type WebLlmProgressReport = {
  progress?: number;
  text?: string;
};

type WebLlmChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type WebLlmCompletion = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type WebLlmEngine = {
  chat: {
    completions: {
      create(request: {
        messages: WebLlmChatMessage[];
        temperature: number;
        max_tokens: number;
      }): Promise<WebLlmCompletion>;
    };
  };
  unload?(): Promise<void>;
};

type WebLlmModule = WebLlmModelListModule & {
  CreateWebWorkerMLCEngine(
    worker: Worker,
    modelId: string,
    options?: {
      initProgressCallback?: (report: WebLlmProgressReport) => void;
    }
  ): Promise<WebLlmEngine>;
};

type NavigatorWithGpu = Navigator & {
  gpu?: {
    requestAdapter(options?: { powerPreference?: "low-power" | "high-performance" }): Promise<unknown | null>;
  };
};

type NormalizedLlmAnalyzerOptions = Required<Omit<LlmAnalyzerOptions, "workerUrl">> & {
  workerUrl?: string;
};

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

async function ensureWebGpuAdapter(): Promise<LlmErrorDetail | null> {
  if (!isWebGpuAvailable()) {
    return classifyLlmError(new Error("navigator.gpu is not available"));
  }

  try {
    const adapter = await (navigator as NavigatorWithGpu).gpu?.requestAdapter({ powerPreference: "high-performance" });
    if (!adapter) {
      return classifyLlmError(new Error("No available WebGPU adapters"));
    }
  } catch (error) {
    return classifyLlmError(error);
  }

  return null;
}

class WorkerLlmContextAnalyzer implements LlmContextAnalyzer {
  private worker: Worker | null = null;
  private engine: WebLlmEngine | null = null;
  private loadedModelId: string | null = null;
  private enginePromise: Promise<{ engine: WebLlmEngine; modelId: string }> | null = null;

  constructor(private readonly options: NormalizedLlmAnalyzerOptions) {}

  async analyze(input: string, options: AnalyzeContextOptions = {}): Promise<ContextAnalysisResult> {
    const startedAt = performance.now();

    if (typeof Worker === "undefined") {
      return createErrorResult(this.options.modelId, startedAt, WEBGPU_UNAVAILABLE_MESSAGE);
    }

    if (options.signal?.aborted) {
      return createErrorResult(this.options.modelId, startedAt, "AI文脈チェックが中断されました。");
    }

    const webGpuError = await ensureWebGpuAdapter();
    if (webGpuError) {
      return createErrorResult(this.options.modelId, startedAt, webGpuError.message, webGpuError);
    }

    const inputForModel = input.slice(0, this.options.maxInputChars);

    try {
      const { engine, modelId } = await this.getEngine(options.onProgress);

      if (options.signal?.aborted) {
        return createErrorResult(modelId, startedAt, "AI文脈チェックが中断されました。");
      }

      options.onProgress?.({ phase: "analyzing", message: ANALYZING_MESSAGE });
      const messages = buildContextRiskPrompt(inputForModel, {
        existingFindings: options.existingFindings ?? [],
        ...(typeof options.maxCandidates === "number" ? { maxCandidates: options.maxCandidates } : {})
      });

      const completion = await engine.chat.completions.create({
        messages,
        temperature: this.options.temperature,
        max_tokens: this.options.maxTokens
      });
      const rawText = completion.choices?.[0]?.message?.content ?? "";
      const parsed = parseContextAnalysisJson(rawText, {
        ...(typeof options.maxCandidates === "number" ? { maxCandidates: options.maxCandidates } : {}),
        confidenceThreshold: this.options.confidenceThreshold
      });

      return {
        candidates: parsed.candidates,
        summary: parsed.summary,
        rawText,
        modelId,
        elapsedMs: Math.max(0, performance.now() - startedAt)
      };
    } catch (error) {
      const detail = classifyLlmError(error);
      this.dispose();
      return createErrorResult(this.options.modelId, startedAt, detail.message, detail);
    }
  }

  dispose(): void {
    void this.engine?.unload?.();
    this.worker?.terminate();
    this.worker = null;
    this.engine = null;
    this.loadedModelId = null;
    this.enginePromise = null;
  }

  private async getEngine(onProgress?: (progress: LlmProgress) => void): Promise<{ engine: WebLlmEngine; modelId: string }> {
    if (this.engine && this.loadedModelId) {
      return { engine: this.engine, modelId: this.loadedModelId };
    }

    if (this.enginePromise) {
      return this.enginePromise;
    }

    this.enginePromise = this.createEngine(onProgress);
    try {
      return await this.enginePromise;
    } finally {
      this.enginePromise = null;
    }
  }

  private async createEngine(onProgress?: (progress: LlmProgress) => void): Promise<{ engine: WebLlmEngine; modelId: string }> {
    const webllm = (await import("@mlc-ai/web-llm")) as unknown as WebLlmModule;
    const modelId = resolveModelId(webllm, this.options.modelId);

    onProgress?.({
      phase: "loading",
      message: `${MODEL_LOADING_MESSAGE} 使用モデル: ${modelId}`
    });

    const worker = this.options.workerUrl ? new Worker(this.options.workerUrl, { type: "module" }) : new WebLlmWorker();
    this.worker = worker;
    this.engine = await webllm.CreateWebWorkerMLCEngine(worker, modelId, {
      initProgressCallback: (report) => {
        const progress: LlmProgress = {
          phase: "loading",
          message: report.text && report.text.length > 0 ? report.text : MODEL_LOADING_MESSAGE
        };

        if (typeof report.progress === "number") {
          progress.progress = report.progress;
        }

        onProgress?.(progress);
      }
    });
    this.loadedModelId = modelId;

    return { engine: this.engine, modelId };
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
