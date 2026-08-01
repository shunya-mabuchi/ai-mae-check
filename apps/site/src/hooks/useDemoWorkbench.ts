import { useCallback, useMemo, useReducer, useRef } from "react";
import type { DetectionResult } from "@ai-mae-check/core";
import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import { contextSampleText, sampleText } from "../lib/demoConstants";
import { createDemoMaskingViewModel } from "../lib/demoMasking";
import type { DemoLlmUiState } from "../lib/demoLlmUiState";
import {
  createDemoRuleDetectionState,
  createDemoTextReplacementState,
  demoWorkbenchReducer
} from "../lib/demoWorkbenchState";
import { useDemoLlmAnalysis } from "./useDemoLlmAnalysis";

const emptySummary = {
  total: 0,
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
  byRule: {}
} as DetectionResult["summary"];

export interface DemoWorkbenchViewModel {
  text: string;
  detection: DetectionResult | null;
  summary: DetectionResult["summary"];
  selectedRuleFindingIds: string[];
  llmCandidates: ContextRiskCandidate[];
  selectedCandidateIds: string[];
  maskedText: string;
  copyMessage: string;
  llmUiState: DemoLlmUiState;
  setText: (value: string) => void;
  insertSample: () => void;
  insertContextSample: () => void;
  runRuleDetection: () => void;
  runLlmDetection: () => Promise<void>;
  copyMaskedText: () => Promise<void>;
  reset: () => void;
  toggleRuleFinding: (id: string) => void;
  toggleCandidate: (id: string) => void;
}

export function useDemoWorkbench(): DemoWorkbenchViewModel {
  const [state, dispatch] = useReducer(
    demoWorkbenchReducer,
    "",
    createDemoTextReplacementState
  );
  const llmRequestSequence = useRef(0);
  const { runLlmDetection: analyzeText } = useDemoLlmAnalysis();

  const maskingViewModel = useMemo(
    () =>
      createDemoMaskingViewModel({
        inputText: state.text,
        detection: state.detection,
        selectedRuleFindingIds: state.selectedRuleFindingIds,
        llmCandidates: state.llmCandidates,
        selectedCandidateIds: state.selectedCandidateIds
      }),
    [
      state.detection,
      state.llmCandidates,
      state.selectedCandidateIds,
      state.selectedRuleFindingIds,
      state.text
    ]
  );

  const setText = useCallback((text: string) => {
    dispatch({ type: "text_changed", text });
  }, []);

  const insertSample = useCallback(() => {
    dispatch({ type: "text_replaced", text: sampleText });
  }, []);

  const insertContextSample = useCallback(() => {
    dispatch({ type: "text_replaced", text: contextSampleText });
  }, []);

  const runRuleDetection = useCallback(() => {
    dispatch({
      type: "rule_detection_completed",
      state: createDemoRuleDetectionState(state.text)
    });
  }, [state.text]);

  const runLlmDetection = useCallback(async () => {
    const requestId = ++llmRequestSequence.current;
    await analyzeText({
      text: state.text,
      detection: state.detection,
      selectedRuleFindingIds: state.selectedRuleFindingIds,
      requestId,
      dispatch
    });
  }, [
    analyzeText,
    state.detection,
    state.selectedRuleFindingIds,
    state.text
  ]);

  const reset = useCallback(() => {
    dispatch({ type: "reset" });
  }, []);

  const copyMaskedText = useCallback(async () => {
    if (!maskingViewModel.maskedText) {
      return;
    }

    await navigator.clipboard.writeText(maskingViewModel.maskedText);
    dispatch({
      type: "copy_completed",
      message: "安全化後テキストをコピーしました。"
    });
  }, [maskingViewModel.maskedText]);

  const toggleRuleFinding = useCallback((id: string) => {
    dispatch({ type: "rule_finding_toggled", id });
  }, []);

  const toggleCandidate = useCallback((id: string) => {
    dispatch({ type: "llm_candidate_toggled", id });
  }, []);

  return {
    text: state.text,
    detection: state.detection,
    summary: state.detection?.summary ?? emptySummary,
    selectedRuleFindingIds: state.selectedRuleFindingIds,
    llmCandidates: state.llmCandidates,
    selectedCandidateIds: state.selectedCandidateIds,
    maskedText: maskingViewModel.maskedText,
    copyMessage: state.copyMessage,
    llmUiState: state.llmUiState,
    setText,
    insertSample,
    insertContextSample,
    runRuleDetection,
    runLlmDetection,
    copyMaskedText,
    reset,
    toggleRuleFinding,
    toggleCandidate
  };
}
