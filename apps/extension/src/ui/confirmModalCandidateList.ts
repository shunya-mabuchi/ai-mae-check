import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import { renderReviewCandidateList, type RenderReviewCandidateListOptions } from "../lib/reviewListRenderers";

export function renderConfirmModalCandidateList(
  container: HTMLElement,
  candidates: ContextRiskCandidate[],
  selectedCandidateIds: Set<string>,
  onChange: () => void,
  options: RenderReviewCandidateListOptions = {}
): void {
  renderReviewCandidateList(container, candidates, selectedCandidateIds, onChange, options);
}
