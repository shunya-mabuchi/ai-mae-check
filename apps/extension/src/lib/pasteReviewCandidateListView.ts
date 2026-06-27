import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import { createPasteReviewCandidateView } from "./pasteReviewCandidateView";
import {
  createPasteReviewEmptySelectableListView,
  type PasteReviewSelectableListItemBase,
  type PasteReviewSelectableListView
} from "./pasteReviewSelectableListView";

export const PASTE_REVIEW_CANDIDATE_EMPTY_MESSAGE = "AI文脈チェックの追加候補はありません。";

export interface PasteReviewCandidateListItemView extends PasteReviewSelectableListItemBase {
  label: string;
  surface: string;
  reason: string;
  riskBadgeClassName: string;
  riskBadgeText: string;
  confidenceText: string;
  selectionLabel: string;
}

export type PasteReviewCandidateListView = PasteReviewSelectableListView<PasteReviewCandidateListItemView>;

export interface PasteReviewCandidateListViewOptions {
  showEmptyMessage?: boolean;
}

export function createPasteReviewCandidateListView(
  candidates: ContextRiskCandidate[],
  selectedCandidateIds: Set<string>,
  options: PasteReviewCandidateListViewOptions = {}
): PasteReviewCandidateListView {
  if (candidates.length === 0) {
    if (options.showEmptyMessage === false) {
      return {
        items: []
      };
    }
    return createPasteReviewEmptySelectableListView(PASTE_REVIEW_CANDIDATE_EMPTY_MESSAGE);
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
