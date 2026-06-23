/// <reference path="./vite-env.d.ts" />

import {
  ANALYZING_MESSAGE,
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_MAX_INPUT_CHARS,
  DEFAULT_MODEL_ID,
  WEBGPU_UNAVAILABLE_MESSAGE
} from "./constants";
import {
  createContextAnalysisFallbackResult,
  createContextAnalysisResultFromRawText
} from "./analysisResult";
import { buildContextCheckPlan, createContextCheckInput } from "./contextBuilder";
import { classifyLlmError } from "./errors";
import { buildContextRiskPrompt } from "./prompt";
import { ensureWebGpuAdapter } from "./webgpuAdapter";
import type {
  AnalyzeContextOptions,
  ContextAnalysisResult,
  LlmAnalyzerOptions,
  LlmContextAnalyzer,
  LlmProgress
} from "./types";
import {
  createWebLlmEngineLifecycle,
  type WebLlmChatMessage,
  type WebLlmEngine,
  type WebLlmEngineLifecycle
} from "./webllmLifecycle";

type NormalizedLlmAnalyzerOptions = Required<Omit<LlmAnalyzerOptions, "workerUrl">> & {
  workerUrl?: string;
};

interface ContextAnalysisRequest {
  inputForModel: string;
  messages: WebLlmChatMessage[];
  maxCandidates?: number;
}

const ANALYSIS_ABORTED_MESSAGE = "AI文脈チェックが中断されました。";

function elapsedSince(startedAt: number): number {
  return Math.max(0, performance.now() - startedAt);
}

function createAnalysisRequest(
  input: string,
  analyzerOptions: NormalizedLlmAnalyzerOptions,
  options: AnalyzeContextOptions
): ContextAnalysisRequest {
  const maxCandidates = typeof options.maxCandidates === "number" ? options.maxCandidates : undefined;
  const plan = buildContextCheckPlan(input, {
    existingFindings: options.existingFindings ?? [],
    maxInputChars: analyzerOptions.maxInputChars,
    ...(typeof maxCandidates === "number" ? { maxCandidates } : {})
  });
  const inputForModel = createContextCheckInput(plan);

  return {
    inputForModel,
    messages: buildContextRiskPrompt(inputForModel, {
      existingFindings: plan.existingFindings,
      maxCandidates: plan.maxCandidates
    }),
    maxCandidates: plan.maxCandidates
  };
}

function createAbortedResult(modelId: string, startedAt: number): ContextAnalysisResult {
  return createContextAnalysisFallbackResult({
    input: "",
    modelId,
    elapsedMs: elapsedSince(startedAt),
    error: ANALYSIS_ABORTED_MESSAGE,
    maxCandidates: 0
  });
}

function createExecutionFallbackResult(
  request: ContextAnalysisRequest,
  modelId: string,
  startedAt: number,
  error: string,
  errorDetail?: ReturnType<typeof classifyLlmError>
): ContextAnalysisResult {
  return createContextAnalysisFallbackResult({
    input: request.inputForModel,
    modelId,
    elapsedMs: elapsedSince(startedAt),
    error,
    ...(errorDetail ? { errorDetail } : {}),
    ...(typeof request.maxCandidates === "number" ? { maxCandidates: request.maxCandidates } : {})
  });
}

async function runContextAnalysis(
  engine: WebLlmEngine,
  request: ContextAnalysisRequest,
  analyzerOptions: NormalizedLlmAnalyzerOptions,
  onProgress?: (progress: LlmProgress) => void
): Promise<string> {
  onProgress?.({ phase: "analyzing", message: ANALYZING_MESSAGE });
  const completion = await engine.chat.completions.create({
    messages: request.messages,
    temperature: analyzerOptions.temperature,
    max_tokens: analyzerOptions.maxTokens
  });

  return completion.choices?.[0]?.message?.content ?? "";
}

function formatContextAnalysisResult(
  request: ContextAnalysisRequest,
  rawText: string,
  modelId: string,
  startedAt: number,
  analyzerOptions: NormalizedLlmAnalyzerOptions
): ContextAnalysisResult {
  return createContextAnalysisResultFromRawText({
    input: request.inputForModel,
    rawText,
    modelId,
    elapsedMs: elapsedSince(startedAt),
    ...(typeof request.maxCandidates === "number" ? { maxCandidates: request.maxCandidates } : {}),
    confidenceThreshold: analyzerOptions.confidenceThreshold
  });
}

class WorkerLlmContextAnalyzer implements LlmContextAnalyzer {
  private readonly lifecycle: WebLlmEngineLifecycle;

  constructor(private readonly options: NormalizedLlmAnalyzerOptions) {
    this.lifecycle = createWebLlmEngineLifecycle({
      modelId: options.modelId,
      ...(options.workerUrl ? { workerUrl: options.workerUrl } : {})
    });
  }

  async analyze(input: string, options: AnalyzeContextOptions = {}): Promise<ContextAnalysisResult> {
    const startedAt = performance.now();
    const request = createAnalysisRequest(input, this.options, options);

    if (options.signal?.aborted) {
      return createAbortedResult(this.options.modelId, startedAt);
    }

    if (typeof Worker === "undefined") {
      const detail = classifyLlmError(new Error("Worker is not available"));
      return createExecutionFallbackResult(request, this.options.modelId, startedAt, WEBGPU_UNAVAILABLE_MESSAGE, detail);
    }

    const webGpuError = await ensureWebGpuAdapter();
    if (webGpuError) {
      return createExecutionFallbackResult(request, this.options.modelId, startedAt, webGpuError.message, webGpuError);
    }

    try {
      const { engine, modelId } = await this.lifecycle.getOrCreate(options.onProgress);

      if (options.signal?.aborted) {
        return createAbortedResult(modelId, startedAt);
      }

      const rawText = await runContextAnalysis(engine, request, this.options, options.onProgress);
      return formatContextAnalysisResult(request, rawText, modelId, startedAt, this.options);
    } catch (error) {
      const detail = classifyLlmError(error);
      this.dispose();
      return createExecutionFallbackResult(request, this.options.modelId, startedAt, detail.message, detail);
    }
  }

  dispose(): void {
    this.lifecycle.dispose();
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
