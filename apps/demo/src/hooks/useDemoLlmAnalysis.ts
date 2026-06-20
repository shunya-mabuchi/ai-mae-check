import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { detectSensitiveText, type DetectionResult } from "@ai-mae-check/core";
import {
  classifyLlmError,
  createLlmContextAnalyzer,
  isContextAnalysisExecutionError,
  isWebGpuAvailable,
  type ContextRiskCandidate,
  type LlmContextAnalyzer
} from "@ai-mae-check/llm";
import {
  createEmptyInputLlmUiState,
  createErrorLlmUiState,
  createLlmResultUiState,
  createLoadingLlmUiState,
  createProgressLlmUiState,
  createWebGpuUnavailableLlmUiState,
  type DemoLlmUiState
} from "../lib/demoLlmUiState";
import { createInitialSelectedFindingIds } from "../lib/demoSelection";
import { selectCandidateIdsByConfidence } from "../lib/demoMasking";

export interface RunDemoLlmDetectionOptions {
  text: string;
  detection: DetectionResult | null;
  setDetection: (detection: DetectionResult) => void;
  setSelectedRuleFindingIds: Dispatch<SetStateAction<string[]>>;
  setLlmCandidates: Dispatch<SetStateAction<ContextRiskCandidate[]>>;
  setSelectedCandidateIds: Dispatch<SetStateAction<string[]>>;
}

export interface DemoLlmAnalysisViewModel {
  llmUiState: DemoLlmUiState;
  runLlmDetection: (options: RunDemoLlmDetectionOptions) => Promise<void>;
}

export function useDemoLlmAnalysis(): DemoLlmAnalysisViewModel {
  const analyzerRef = useRef<LlmContextAnalyzer | null>(null);
  const [llmUiState, setLlmUiState] = useState<DemoLlmUiState>(() => ({
    status: "idle",
    message: "AI文脈チェックは手動で実行できます。",
    errorDetail: null
  }));

  useEffect(() => {
    return () => {
      analyzerRef.current?.dispose();
      analyzerRef.current = null;
    };
  }, []);

  const disposeAnalyzer = useCallback(() => {
    analyzerRef.current?.dispose();
    analyzerRef.current = null;
  }, []);

  const getAnalyzer = useCallback(() => {
    analyzerRef.current ??= createLlmContextAnalyzer();
    return analyzerRef.current;
  }, []);

  const runLlmDetection = useCallback(
    async (options: RunDemoLlmDetectionOptions) => {
      if (options.text.trim().length === 0) {
        setLlmUiState(createEmptyInputLlmUiState());
        return;
      }

      let currentDetection = options.detection;
      if (!currentDetection) {
        currentDetection = detectSensitiveText(options.text);
        options.setDetection(currentDetection);
        options.setSelectedRuleFindingIds(createInitialSelectedFindingIds(currentDetection.findings));
      }

      if (!isWebGpuAvailable()) {
        setLlmUiState(createWebGpuUnavailableLlmUiState());
        return;
      }

      setLlmUiState(createLoadingLlmUiState());
      const analyzer = getAnalyzer();

      try {
        const result = await analyzer.analyze(options.text, {
          existingFindings: currentDetection.findings,
          onProgress: (progress) => setLlmUiState(createProgressLlmUiState(progress))
        });

        if (isContextAnalysisExecutionError(result)) {
          setLlmUiState(
            result.errorDetail
              ? createErrorLlmUiState(result.errorDetail)
              : {
                  status: "error",
                  message: result.error ?? "AI文脈チェックを実行できませんでした。",
                  errorDetail: null
                }
          );
          disposeAnalyzer();
          return;
        }

        options.setLlmCandidates(result.candidates);
        options.setSelectedCandidateIds(selectCandidateIdsByConfidence(result.candidates));
        setLlmUiState(createLlmResultUiState(result.candidates.length, result.errorDetail));
      } catch (error) {
        const errorDetail = classifyLlmError(error);
        setLlmUiState(createErrorLlmUiState(errorDetail));
        disposeAnalyzer();
      }
    },
    [disposeAnalyzer, getAnalyzer]
  );

  return {
    llmUiState,
    runLlmDetection
  };
}
