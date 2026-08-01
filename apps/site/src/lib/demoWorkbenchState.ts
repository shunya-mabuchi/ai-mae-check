import { detectSensitiveText, type DetectionResult } from "@ai-mae-check/core";
import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import {
  createIdleLlmUiState,
  type DemoLlmUiState
} from "./demoLlmUiState";
import {
  createInitialSelectedFindingIds,
  toggleSelectedId
} from "./demoSelection";

export interface DemoWorkbenchStateSnapshot {
  text: string;
  detection: DetectionResult | null;
  selectedRuleFindingIds: string[];
  llmCandidates: ContextRiskCandidate[];
  selectedCandidateIds: string[];
  copyMessage: string;
  llmUiState: DemoLlmUiState;
  activeLlmRequestId: number | null;
}

export type DemoWorkbenchAction =
  | { type: "text_changed"; text: string }
  | { type: "text_replaced"; text: string }
  | { type: "rule_detection_completed"; state: DemoWorkbenchStateSnapshot }
  | {
      type: "llm_started";
      requestId: number;
      detection: DetectionResult;
      selectedRuleFindingIds: string[];
      uiState: DemoLlmUiState;
    }
  | { type: "llm_progressed"; requestId: number; uiState: DemoLlmUiState }
  | {
      type: "llm_completed";
      requestId: number;
      candidates: ContextRiskCandidate[];
      selectedCandidateIds: string[];
      uiState: DemoLlmUiState;
    }
  | { type: "llm_failed"; requestId: number; uiState: DemoLlmUiState }
  | { type: "llm_validation_failed"; uiState: DemoLlmUiState }
  | { type: "rule_finding_toggled"; id: string }
  | { type: "llm_candidate_toggled"; id: string }
  | { type: "copy_completed"; message: string }
  | { type: "reset" };

export function createDemoTextReplacementState(text: string): DemoWorkbenchStateSnapshot {
  return {
    text,
    detection: null,
    selectedRuleFindingIds: [],
    llmCandidates: [],
    selectedCandidateIds: [],
    copyMessage: "",
    llmUiState: createIdleLlmUiState(),
    activeLlmRequestId: null
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
    llmUiState: createIdleLlmUiState(),
    activeLlmRequestId: null
  };
}

function isCurrentLlmRequest(
  state: DemoWorkbenchStateSnapshot,
  requestId: number
): boolean {
  return state.activeLlmRequestId === requestId;
}

export function demoWorkbenchReducer(
  state: DemoWorkbenchStateSnapshot,
  action: DemoWorkbenchAction
): DemoWorkbenchStateSnapshot {
  switch (action.type) {
    case "text_changed":
    case "text_replaced":
      return createDemoTextReplacementState(action.text);
    case "rule_detection_completed":
      return action.state;
    case "llm_started":
      return {
        ...state,
        detection: action.detection,
        selectedRuleFindingIds: action.selectedRuleFindingIds,
        llmCandidates: [],
        selectedCandidateIds: [],
        copyMessage: "",
        llmUiState: action.uiState,
        activeLlmRequestId: action.requestId
      };
    case "llm_progressed":
      return isCurrentLlmRequest(state, action.requestId)
        ? { ...state, llmUiState: action.uiState }
        : state;
    case "llm_completed":
      return isCurrentLlmRequest(state, action.requestId)
        ? {
            ...state,
            llmCandidates: action.candidates,
            selectedCandidateIds: action.selectedCandidateIds,
            llmUiState: action.uiState,
            activeLlmRequestId: null
          }
        : state;
    case "llm_failed":
      return isCurrentLlmRequest(state, action.requestId)
        ? { ...state, llmUiState: action.uiState, activeLlmRequestId: null }
        : state;
    case "llm_validation_failed":
      return { ...state, llmUiState: action.uiState, activeLlmRequestId: null };
    case "rule_finding_toggled":
      return {
        ...state,
        selectedRuleFindingIds: toggleSelectedId(state.selectedRuleFindingIds, action.id),
        copyMessage: ""
      };
    case "llm_candidate_toggled":
      return {
        ...state,
        selectedCandidateIds: toggleSelectedId(state.selectedCandidateIds, action.id),
        copyMessage: ""
      };
    case "copy_completed":
      return { ...state, copyMessage: action.message };
    case "reset":
      return createDemoTextReplacementState("");
  }
}
