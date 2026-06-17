import { mergeFindings, type Finding } from "@ai-mae-check/core";
import {
  convertContextCandidatesToFindings,
  DEFAULT_SELECTED_CONTEXT_CANDIDATE_CONFIDENCE,
  selectContextCandidateIdsByConfidence,
  type ContextRiskCandidate
} from "@ai-mae-check/llm";

export const DEFAULT_SELECTED_CANDIDATE_CONFIDENCE = DEFAULT_SELECTED_CONTEXT_CANDIDATE_CONFIDENCE;

export interface ResolveReviewFindingsOptions {
  input: string;
  ruleFindings: Finding[];
  selectedRuleFindingIds: ReadonlySet<string>;
  candidates: ContextRiskCandidate[];
  selectedCandidateIds: ReadonlySet<string>;
}

export function createInitialSelectedFindingIds(findings: Finding[]): Set<string> {
  return new Set(findings.map((finding) => finding.id));
}

export function createInitialSelectedCandidateIds(
  candidates: ContextRiskCandidate[],
  confidenceThreshold = DEFAULT_SELECTED_CANDIDATE_CONFIDENCE
): Set<string> {
  return new Set(selectContextCandidateIdsByConfidence(candidates, confidenceThreshold));
}

export function updateSelectedIdSet(selectedIds: Set<string>, id: string, selected: boolean): void {
  if (selected) {
    selectedIds.add(id);
    return;
  }

  selectedIds.delete(id);
}

export interface ReviewSelectionToggleOptions {
  selectedIds: Set<string>;
  id: string;
  checked: boolean;
  onChange: () => void;
}

export function handleReviewSelectionToggle(options: ReviewSelectionToggleOptions): void {
  updateSelectedIdSet(options.selectedIds, options.id, options.checked);
  options.onChange();
}

export function resolveReviewFindings(options: ResolveReviewFindingsOptions): Finding[] {
  const selectedRuleFindings = options.ruleFindings.filter((finding) =>
    options.selectedRuleFindingIds.has(finding.id)
  );
  const selectedCandidates = options.candidates.filter((candidate) =>
    options.selectedCandidateIds.has(candidate.id)
  );
  const llmFindings = convertContextCandidatesToFindings(options.input, selectedCandidates);

  return mergeFindings(selectedRuleFindings, llmFindings);
}
