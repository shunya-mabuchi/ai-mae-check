import { useCallback, useMemo, useState } from "react";
import { type DetectionResult } from "@ai-mae-check/core";
import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import { contextSampleText, sampleText } from "../lib/demoConstants";
import { createDemoMaskingViewModel } from "../lib/demoMasking";
import { toggleSelectedId } from "../lib/demoSelection";
import type { DemoLlmUiState } from "../lib/demoLlmUiState";
import {
  createDemoRuleDetectionState,
  createDemoTextReplacementState,
  type DemoWorkbenchStateSnapshot
} from "../lib/demoWorkbenchState";
import { useDemoLlmAnalysis } from "./useDemoLlmAnalysis";

const emptySummary = { total: 0, critical: 0, high: 0, medium: 0, low: 0, byRule: {} } as DetectionResult["summary"];

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
  const [text, setText] = useState("");
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [selectedRuleFindingIds, setSelectedRuleFindingIds] = useState<string[]>([]);
  const [llmCandidates, setLlmCandidates] = useState<ContextRiskCandidate[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [copyMessage, setCopyMessage] = useState("");

  const { llmUiState, runLlmDetection: analyzeText } = useDemoLlmAnalysis();

  const maskingViewModel = useMemo(
    () =>
      createDemoMaskingViewModel({
        inputText: text,
        detection,
        selectedRuleFindingIds,
        llmCandidates,
        selectedCandidateIds
      }),
    [detection, llmCandidates, selectedCandidateIds, selectedRuleFindingIds, text]
  );

  const summary = detection?.summary ?? emptySummary;

  const applyWorkbenchState = useCallback((state: DemoWorkbenchStateSnapshot) => {
    setText(state.text);
    setDetection(state.detection);
    setSelectedRuleFindingIds(state.selectedRuleFindingIds);
    setLlmCandidates(state.llmCandidates);
    setSelectedCandidateIds(state.selectedCandidateIds);
    setCopyMessage(state.copyMessage);
  }, []);

  const insertSample = useCallback(() => {
    applyWorkbenchState(createDemoTextReplacementState(sampleText));
  }, [applyWorkbenchState]);

  const insertContextSample = useCallback(() => {
    applyWorkbenchState(createDemoTextReplacementState(contextSampleText));
  }, [applyWorkbenchState]);

  const runRuleDetection = useCallback(() => {
    applyWorkbenchState(createDemoRuleDetectionState(text));
  }, [applyWorkbenchState, text]);

  const runLlmDetection = useCallback(async () => {
    await analyzeText({
      text,
      detection,
      setDetection,
      setSelectedRuleFindingIds,
      setLlmCandidates,
      setSelectedCandidateIds
    });
  }, [analyzeText, detection, text]);

  const reset = useCallback(() => {
    applyWorkbenchState(createDemoTextReplacementState(""));
  }, [applyWorkbenchState]);

  const copyMaskedText = useCallback(async () => {
    if (!maskingViewModel.maskedText) {
      return;
    }

    await navigator.clipboard.writeText(maskingViewModel.maskedText);
    setCopyMessage("安全化後テキストをコピーしました。");
  }, [maskingViewModel.maskedText]);

  const toggleRuleFinding = useCallback((id: string) => {
    setSelectedRuleFindingIds((current) => toggleSelectedId(current, id));
  }, []);

  const toggleCandidate = useCallback((id: string) => {
    setSelectedCandidateIds((current) => toggleSelectedId(current, id));
  }, []);

  return {
    text,
    detection,
    summary,
    selectedRuleFindingIds,
    llmCandidates,
    selectedCandidateIds,
    maskedText: maskingViewModel.maskedText,
    copyMessage,
    llmUiState,
    setText: (value: string) => {
      setText(value);
      setCopyMessage("");
    },
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
