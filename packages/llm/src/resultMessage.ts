import { createJsonParseFallbackMessage, isJsonParseLlmErrorMessage } from "./errors";
import type { LlmErrorDetail } from "./types";

export const CONTEXT_ANALYSIS_FOUND_MESSAGE = "AI文脈チェックで注意候補が見つかりました。";
export const CONTEXT_ANALYSIS_EMPTY_MESSAGE =
  "AI文脈チェックでは追加の注意候補は見つかりませんでした。ただし、安全を保証するものではありません。";

export interface CreateContextAnalysisResultMessageOptions {
  candidateCount: number;
  summary?: string | undefined;
  errorDetail?: LlmErrorDetail | undefined;
}

export function createContextAnalysisCompleteMessage(candidateCount: number, summary?: string): string {
  if (isJsonParseLlmErrorMessage(summary)) {
    return createJsonParseFallbackMessage(candidateCount);
  }

  return candidateCount > 0 ? CONTEXT_ANALYSIS_FOUND_MESSAGE : CONTEXT_ANALYSIS_EMPTY_MESSAGE;
}

export function createContextAnalysisResultMessage(options: CreateContextAnalysisResultMessageOptions): string {
  if (options.errorDetail?.kind === "json_parse") {
    return createJsonParseFallbackMessage(options.candidateCount);
  }

  return createContextAnalysisCompleteMessage(options.candidateCount, options.summary);
}
