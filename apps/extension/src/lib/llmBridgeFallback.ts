import {
  classifyLlmError,
  createJsonParseFallbackMessage,
  mergeResidualContextCandidates,
  type ContextAnalysisResult
} from "@ai-mae-check/llm";

interface JsonParseBridgeFallbackOptions {
  inputText: string;
  modelId: string;
  startedAt: number;
  error: unknown;
  maxCandidates?: number;
}

export function createJsonParseBridgeFallbackResult(
  options: JsonParseBridgeFallbackOptions
): ContextAnalysisResult | null {
  const errorDetail = classifyLlmError(options.error);
  if (errorDetail.kind !== "json_parse") {
    return null;
  }

  const candidates = mergeResidualContextCandidates(options.inputText, [], {
    ...(typeof options.maxCandidates === "number" ? { maxCandidates: options.maxCandidates } : {})
  });

  return {
    candidates,
    summary: createJsonParseFallbackMessage(candidates.length),
    rawText: "",
    modelId: options.modelId,
    elapsedMs: Math.max(0, performance.now() - options.startedAt)
  };
}
