import { useCallback, useEffect, useRef, type Dispatch } from "react";
import { detectSensitiveText, type DetectionResult } from "@ai-mae-check/core";
import {
  classifyLlmError,
  createLocalLlmRuntimeService,
  isContextAnalysisExecutionError,
  type LocalLlmRuntimeService
} from "@ai-mae-check/llm";
import {
  createEmptyInputLlmUiState,
  createErrorLlmUiState,
  createLlmResultUiState,
  createLoadingLlmUiState,
  createProgressLlmUiState
} from "../lib/demoLlmUiState";
import { selectCandidateIdsByConfidence } from "../lib/demoMasking";
import { resolveLlmSelectedFindingIds } from "../lib/demoSelection";
import type { DemoWorkbenchAction } from "../lib/demoWorkbenchState";

export interface RunDemoLlmDetectionOptions {
  text: string;
  detection: DetectionResult | null;
  selectedRuleFindingIds: string[];
  requestId: number;
  dispatch: Dispatch<DemoWorkbenchAction>;
}

export interface DemoLlmAnalysisViewModel {
  runLlmDetection: (options: RunDemoLlmDetectionOptions) => Promise<void>;
}

export function useDemoLlmAnalysis(): DemoLlmAnalysisViewModel {
  const runtimeServiceRef = useRef<LocalLlmRuntimeService | null>(null);

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
    async ({
      text,
      detection,
      selectedRuleFindingIds,
      requestId,
      dispatch
    }: RunDemoLlmDetectionOptions) => {
      if (text.trim().length === 0) {
        dispatch({
          type: "llm_validation_failed",
          uiState: createEmptyInputLlmUiState()
        });
        return;
      }

      const currentDetection = detection ?? detectSensitiveText(text);
      dispatch({
        type: "llm_started",
        requestId,
        detection: currentDetection,
        selectedRuleFindingIds: resolveLlmSelectedFindingIds({
          hasDetection: detection !== null,
          selectedFindingIds: selectedRuleFindingIds,
          findings: currentDetection.findings
        }),
        uiState: createLoadingLlmUiState()
      });

      const runtimeService = getRuntimeService();

      try {
        const result = await runtimeService.analyze({
          input: text,
          existingFindings: currentDetection.findings,
          onProgress: (progress) =>
            dispatch({
              type: "llm_progressed",
              requestId,
              uiState: createProgressLlmUiState(progress)
            })
        });

        if (isContextAnalysisExecutionError(result)) {
          dispatch({
            type: "llm_failed",
            requestId,
            uiState: result.errorDetail
              ? createErrorLlmUiState(result.errorDetail)
              : {
                  status: "error",
                  message:
                    result.error ??
                    "AI文脈チェックを実行できませんでした。",
                  errorDetail: null
                }
          });
          await disposeRuntimeService();
          return;
        }

        dispatch({
          type: "llm_completed",
          requestId,
          candidates: result.candidates,
          selectedCandidateIds: selectCandidateIdsByConfidence(
            result.candidates
          ),
          uiState: createLlmResultUiState(
            result.candidates.length,
            result.errorDetail
          )
        });
      } catch (error) {
        dispatch({
          type: "llm_failed",
          requestId,
          uiState: createErrorLlmUiState(classifyLlmError(error))
        });
        await disposeRuntimeService();
      }
    },
    [disposeRuntimeService, getRuntimeService]
  );

  return { runLlmDetection };
}
