import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { detectSensitiveText, type DetectionResult } from "@ai-mae-check/core";
import {
  classifyLlmError,
  createLocalLlmRuntimeService,
  isContextAnalysisExecutionError,
  type ContextRiskCandidate,
  type LocalLlmRuntimeService
} from "@ai-mae-check/llm";
import {
  createEmptyInputLlmUiState,
  createErrorLlmUiState,
  createLlmResultUiState,
  createLoadingLlmUiState,
  createProgressLlmUiState,
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
  const runtimeServiceRef = useRef<LocalLlmRuntimeService | null>(null);
  const [llmUiState, setLlmUiState] = useState<DemoLlmUiState>(() => ({
    status: "idle",
    message: "AI文脈チェックは手動で実行できます。",
    errorDetail: null
  }));

  useEffect(() => {
    return () => {
      void runtimeServiceRef.current?.dispose();
      runtimeServiceRef.current = null;
    };
  }, []);

  const disposeRuntimeService = useCallback(async () => {
    await runtimeServiceRef.current?.dispose();
    runtimeServiceRef.current = null;
  }, []);

  const getRuntimeService = useCallback(() => {
    runtimeServiceRef.current ??= createLocalLlmRuntimeService();
    return runtimeServiceRef.current;
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

      setLlmUiState(createLoadingLlmUiState());
      const runtimeService = getRuntimeService();

      try {
        const result = await runtimeService.analyze({
          input: options.text,
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
          await disposeRuntimeService();
          return;
        }

        options.setLlmCandidates(result.candidates);
        options.setSelectedCandidateIds(selectCandidateIdsByConfidence(result.candidates));
        setLlmUiState(createLlmResultUiState(result.candidates.length, result.errorDetail));
      } catch (error) {
        const errorDetail = classifyLlmError(error);
        setLlmUiState(createErrorLlmUiState(errorDetail));
        await disposeRuntimeService();
      }
    },
    [disposeRuntimeService, getRuntimeService]
  );

  return {
    llmUiState,
    runLlmDetection
  };
}
