import { useCallback, useEffect, type Dispatch } from "react";
import { detectSensitiveText, type DetectionResult } from "@ai-mae-check/core";
import {
  classifyLlmError,
  isContextAnalysisExecutionError
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
import { analyzeDemoContext, disposeDemoContextWorker } from "../lib/demoContextWorkerClient";

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
  useEffect(() => {
    return disposeDemoContextWorker;
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

      try {
        const result = await analyzeDemoContext(
          text,
          (progress) =>
            dispatch({
              type: "llm_progressed",
              requestId,
              uiState: createProgressLlmUiState(progress)
            })
        );

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
          disposeDemoContextWorker();
          return;
        }

        const uiState = createLlmResultUiState(
          result.candidates.length,
          result.errorDetail
        );
        dispatch({
          type: "llm_completed",
          requestId,
          candidates: result.candidates,
          selectedCandidateIds: selectCandidateIdsByConfidence(
            result.candidates
          ),
          uiState: result.warnings?.length
            ? {
                ...uiState,
                message: `${uiState.message} 一部のブラウザ内モデルは利用できませんでした。`
              }
            : uiState
        });
      } catch (error) {
        dispatch({
          type: "llm_failed",
          requestId,
          uiState: createErrorLlmUiState(classifyLlmError(error))
        });
        disposeDemoContextWorker();
      }
    },
    []
  );

  return { runLlmDetection };
}
