import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import { renderReviewCandidateList } from "../lib/reviewListRenderers";

export function renderConfirmModalCandidateList(
  container: HTMLElement,
  candidates: ContextRiskCandidate[],
  selectedCandidateIds: Set<string>,
  onChange: () => void
): void {
  renderReviewCandidateList(container, candidates, selectedCandidateIds, onChange);
}
