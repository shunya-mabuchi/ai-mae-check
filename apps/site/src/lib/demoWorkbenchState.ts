import { detectSensitiveText, type DetectionResult } from "@ai-mae-check/core";
import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import { createIdleLlmUiState, type DemoLlmUiState } from "./demoLlmUiState";
import { createInitialSelectedFindingIds } from "./demoSelection";

export interface DemoWorkbenchStateSnapshot {
  text: string;
  detection: DetectionResult | null;
  selectedRuleFindingIds: string[];
  llmCandidates: ContextRiskCandidate[];
  selectedCandidateIds: string[];
  copyMessage: string;
  llmUiState: DemoLlmUiState;
}

export function createDemoTextReplacementState(text: string): DemoWorkbenchStateSnapshot {
  return {
    text,
    detection: null,
    selectedRuleFindingIds: [],
    llmCandidates: [],
    selectedCandidateIds: [],
    copyMessage: "",
    llmUiState: createIdleLlmUiState()
  };
}

export function createDemoRuleDetectionState(text: string): DemoWorkbenchStateSnapshot {
  const detection = detectSensitiveText(text);

  return {
    text,
    detection,
    selectedRuleFindingIds: createInitialSelectedFindingIds(detection.findings),
    llmCandidates: [],
    selectedCandidateIds: [],
    copyMessage: "",
    llmUiState: createIdleLlmUiState()
  };
}
