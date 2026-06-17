import {
  createContextAnalysisCompleteMessage,
  createContextAnalysisResultMessage,
  selectContextCandidateIdsByConfidence,
  isJsonParseLlmErrorMessage,
  type ContextAnalysisResult,
  type ContextRiskCandidate,
  type LlmErrorDetail
} from "@ai-mae-check/llm";
import type { PasteReviewModalMode } from "./pasteReviewModalCopy";
import type { AiMaeCheckSettings } from "./settings";

export interface PasteReviewLlmResultState {
  candidates: ContextRiskCandidate[];
  selectedCandidateIds: string[];
  statusMessage: string;
}

export const PASTE_REVIEW_LLM_INITIAL_MESSAGE = "AI文脈チェックは手動で実行できます。";
export const PASTE_REVIEW_LLM_DISABLED_MESSAGE = "設定でAI文脈チェックが無効になっています。";
export const PASTE_REVIEW_LLM_LOADING_MESSAGE =
  "ローカルAIモデルを準備しています。初回のみ時間がかかる場合があります。";

export function createPasteReviewLlmCompleteMessage(candidateCount: number, summary?: string): string {
  return createContextAnalysisCompleteMessage(candidateCount, summary);
}

export function createPasteReviewLlmResultMessage(
  candidateCount: number,
  summary?: string,
  detail?: LlmErrorDetail
): string {
  if (detail?.kind === "json_parse") {
    return createContextAnalysisResultMessage({ candidateCount, summary, errorDetail: detail });
  }

  return createPasteReviewLlmCompleteMessage(candidateCount, summary);
}

export function createPasteReviewLlmResultState(
  result: Pick<ContextAnalysisResult, "candidates" | "summary" | "errorDetail">
): PasteReviewLlmResultState {
  return {
    candidates: result.candidates,
    selectedCandidateIds: selectContextCandidateIdsByConfidence(result.candidates),
    statusMessage: createPasteReviewLlmResultMessage(result.candidates.length, result.summary, result.errorDetail)
  };
}

export function formatPasteReviewLlmStatusMessage(message: string, detail?: LlmErrorDetail): string {
  if (detail?.kind === "json_parse" || isJsonParseLlmErrorMessage(message)) {
    return createContextAnalysisResultMessage({ candidateCount: 0, summary: message, errorDetail: detail });
  }

  if (!detail) {
    return message;
  }

  const technical = detail.technicalDetail ? `\n詳細: ${detail.technicalDetail}` : "";
  return `${message}\n診断メモ: ${detail.hint}${technical}`;
}

export function shouldAutoRunPasteReviewLlm(
  mode: PasteReviewModalMode,
  llmSettings: AiMaeCheckSettings["llm"]
): boolean {
  return mode === "default" && llmSettings.enabled && llmSettings.mode === "auto";
}
