import { createJsonParseFallbackMessage } from "./errors";
import { parseContextAnalysisJson } from "./parser";
import { mergeResidualContextCandidates } from "./residualMasking";
import type { ContextAnalysisResult } from "./types";

export interface CreateContextAnalysisResultFromRawTextOptions {
  input: string;
  rawText: string;
  modelId: string;
  elapsedMs: number;
  maxCandidates?: number;
  confidenceThreshold?: number;
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

    return {
      candidates,
      summary: createJsonParseFallbackMessage(candidates.length),
      rawText: options.rawText,
      modelId: options.modelId,
      elapsedMs: options.elapsedMs
    };
  }
}
