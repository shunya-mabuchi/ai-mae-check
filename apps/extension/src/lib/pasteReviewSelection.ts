import { mergeFindings, type Finding } from "@ai-mae-check/core";
import { convertContextCandidatesToFindings, type ContextRiskCandidate } from "@ai-mae-check/llm";

export const DEFAULT_SELECTED_CANDIDATE_CONFIDENCE = 0.75;

export interface ResolvePasteReviewFindingsOptions {
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
  return new Set(
    candidates
      .filter((candidate) => candidate.confidence >= confidenceThreshold)
      .map((candidate) => candidate.id)
  );
}

export function updateSelectedIdSet(selectedIds: Set<string>, id: string, selected: boolean): void {
  if (selected) {
    selectedIds.add(id);
    return;
  }

  selectedIds.delete(id);
}

export interface PasteReviewSelectionToggleOptions {
  selectedIds: Set<string>;
  id: string;
  checked: boolean;
  onChange: () => void;
}

export function handlePasteReviewSelectionToggle(options: PasteReviewSelectionToggleOptions): void {
  updateSelectedIdSet(options.selectedIds, options.id, options.checked);
  options.onChange();
}

export function resolvePasteReviewFindings(options: ResolvePasteReviewFindingsOptions): Finding[] {
  const selectedRuleFindings = options.ruleFindings.filter((finding) =>
    options.selectedRuleFindingIds.has(finding.id)
  );
  const selectedCandidates = options.candidates.filter((candidate) =>
    options.selectedCandidateIds.has(candidate.id)
  );
  const llmFindings = convertContextCandidatesToFindings(options.input, selectedCandidates);

  return mergeFindings(selectedRuleFindings, llmFindings);
}
