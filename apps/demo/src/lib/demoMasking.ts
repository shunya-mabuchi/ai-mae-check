import {
  maskSensitiveText,
  mergeFindings,
  type DetectionResult,
  type Finding
} from "@ai-mae-check/core";
import {
  convertContextCandidatesToFindings,
  type ContextRiskCandidate
} from "@ai-mae-check/llm";

const DEFAULT_SELECTED_CANDIDATE_CONFIDENCE = 0.75;

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
  minConfidence = DEFAULT_SELECTED_CANDIDATE_CONFIDENCE
): string[] {
  return candidates.filter((candidate) => candidate.confidence >= minConfidence).map((candidate) => candidate.id);
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
    maskedText: maskSensitiveText(options.inputText, mergedFindings).maskedText
  };
}
