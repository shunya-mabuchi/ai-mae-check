import { classifyLlmError, createJsonParseFallbackMessage } from "./errors";
import { parseContextAnalysisJson } from "./parser";
import { mergeResidualContextCandidates } from "./residualMasking";
import type { ContextAnalysisResult, LlmErrorDetail } from "./types";

export interface CreateContextAnalysisResultFromRawTextOptions {
  input: string;
  rawText: string;
  modelId: string;
  elapsedMs: number;
  maxCandidates?: number;
  confidenceThreshold?: number;
}

export interface CreateContextAnalysisFallbackResultOptions {
  input: string;
  modelId: string;
  elapsedMs: number;
  error: string;
  errorDetail?: LlmErrorDetail;
  rawText?: string;
  maxCandidates?: number;
}

export function createContextAnalysisResultFromRawText(
  options: CreateContextAnalysisResultFromRawTextOptions
): ContextAnalysisResult {
  const candidateLimitOptions = typeof options.maxCandidates === "number" ? { maxCandidates: options.maxCandidates } : {};

  try {
    const parsed = parseContextAnalysisJson(options.rawText, {
      ...candidateLimitOptions,
      ...(typeof options.confidenceThreshold === "number" ? { confidenceThreshold: options.confidenceThreshold } : {})
    });
    const candidates = mergeResidualContextCandidates(options.input, parsed.candidates, candidateLimitOptions);

    return {
      candidates,
      summary: parsed.summary,
      rawText: options.rawText,
      modelId: options.modelId,
      elapsedMs: options.elapsedMs
    };
  } catch {
    const candidates = mergeResidualContextCandidates(options.input, [], candidateLimitOptions);
    const errorDetail = classifyLlmError(new Error("AI文脈チェックの結果を読み取れませんでした"));

    return {
      candidates,
      summary: createJsonParseFallbackMessage(candidates.length),
      rawText: options.rawText,
      modelId: options.modelId,
      elapsedMs: options.elapsedMs,
      errorDetail
    };
  }
}

export function createContextAnalysisFallbackResult(
  options: CreateContextAnalysisFallbackResultOptions
): ContextAnalysisResult {
  const candidateLimitOptions = typeof options.maxCandidates === "number" ? { maxCandidates: options.maxCandidates } : {};
  const candidates = mergeResidualContextCandidates(options.input, [], candidateLimitOptions);

  return {
    candidates,
    summary: options.error,
    rawText: options.rawText ?? "",
    modelId: options.modelId,
    elapsedMs: options.elapsedMs,
    error: options.error,
    ...(options.errorDetail ? { errorDetail: options.errorDetail } : {})
  };
}
