import {
  mergeFindings,
  transformText,
  type DetectionResult,
  type Finding
} from "@ai-mae-check/core";
import {
  convertContextCandidatesToFindings,
  selectContextCandidateIdsByConfidence,
  type ContextRiskCandidate
} from "@ai-mae-check/llm";

export interface DemoMaskingOptions {
  inputText: string;
  detection: DetectionResult | null;
  selectedRuleFindingIds: string[];
  llmCandidates: ContextRiskCandidate[];
  selectedCandidateIds: string[];
}

export interface DemoMaskingViewModel {
  selectedRuleFindings: Finding[];
  selectedLlmFindings: Finding[];
  mergedFindings: Finding[];
  maskedText: string;
}

export function selectCandidateIdsByConfidence(
  candidates: ContextRiskCandidate[],
  minConfidence?: number
): string[] {
  return selectContextCandidateIdsByConfidence(candidates, minConfidence);
}

export function createDemoMaskingViewModel(options: DemoMaskingOptions): DemoMaskingViewModel {
  const selectedRuleFindings =
    options.detection?.findings.filter((finding) => options.selectedRuleFindingIds.includes(finding.id)) ?? [];
  const selectedCandidates = options.llmCandidates.filter((candidate) => options.selectedCandidateIds.includes(candidate.id));
  const selectedLlmFindings = convertContextCandidatesToFindings(options.inputText, selectedCandidates);
  const mergedFindings = options.detection
    ? mergeFindings(selectedRuleFindings, selectedLlmFindings)
    : selectedLlmFindings;

  if (!options.detection && mergedFindings.length === 0) {
    return {
      selectedRuleFindings,
      selectedLlmFindings,
      mergedFindings,
      maskedText: ""
    };
  }

  if (mergedFindings.length === 0) {
    return {
      selectedRuleFindings,
      selectedLlmFindings,
      mergedFindings,
      maskedText: options.inputText
    };
  }

  return {
    selectedRuleFindings,
    selectedLlmFindings,
    mergedFindings,
    maskedText: transformText(options.inputText, mergedFindings, "generalize").transformedText
  };
}
