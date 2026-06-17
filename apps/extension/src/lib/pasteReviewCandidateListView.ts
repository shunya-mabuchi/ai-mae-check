import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import { createPasteReviewCandidateView } from "./pasteReviewCandidateView";

export const PASTE_REVIEW_CANDIDATE_EMPTY_MESSAGE = "AI文脈チェックの追加候補はありません。";

export interface PasteReviewCandidateListItemView {
  id: string;
  selected: boolean;
  label: string;
  surface: string;
  reason: string;
  riskBadgeClassName: string;
  riskBadgeText: string;
  confidenceText: string;
  selectionLabel: string;
}

export interface PasteReviewCandidateListView {
  emptyMessage?: string;
  items: PasteReviewCandidateListItemView[];
}

export function createPasteReviewCandidateListView(
  candidates: ContextRiskCandidate[],
  selectedCandidateIds: Set<string>
): PasteReviewCandidateListView {
  if (candidates.length === 0) {
    return {
      emptyMessage: PASTE_REVIEW_CANDIDATE_EMPTY_MESSAGE,
      items: []
    };
  }

  return {
    items: candidates.map((candidate) => {
      const selected = selectedCandidateIds.has(candidate.id);
      const view = createPasteReviewCandidateView(candidate, selected);
      return {
        id: candidate.id,
        selected,
        label: candidate.label,
        surface: candidate.surface,
        reason: candidate.reason,
        riskBadgeClassName: view.riskBadgeClassName,
        riskBadgeText: view.riskBadgeText,
        confidenceText: view.confidenceText,
        selectionLabel: view.selectionLabel
      };
    })
  };
}
