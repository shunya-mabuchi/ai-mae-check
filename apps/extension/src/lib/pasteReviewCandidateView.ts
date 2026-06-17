import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import { pasteReviewRiskLabel } from "./pasteReviewState";

export interface PasteReviewCandidateView {
  riskBadgeClassName: string;
  riskBadgeText: string;
  confidenceText: string;
  selectionLabel: string;
}

export function createPasteReviewCandidateView(
  candidate: ContextRiskCandidate,
  selected: boolean
): PasteReviewCandidateView {
  return {
    riskBadgeClassName: `hm-badge hm-badge-${candidate.riskLevel}`,
    riskBadgeText: `危険度: ${pasteReviewRiskLabel[candidate.riskLevel]}`,
    confidenceText: `confidence: ${candidate.confidence.toFixed(2)}`,
    selectionLabel: selected ? "マスク対象" : "マスク対象外"
  };
}
