import { useCallback, useEffect, useRef, type Dispatch } from "react";
import { detectSensitiveText, type DetectionResult } from "@ai-mae-check/core";
import {
  classifyLlmError,
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
import { createDemoLlmRuntimeService } from "../lib/demoLlmRuntimeLoader";

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
  const runtimeServicePromiseRef = useRef<Promise<LocalLlmRuntimeService> | null>(
    null
  );

  useEffect(() => {
    return () => {
      const currentService = runtimeServiceRef.current;
      const pendingService = runtimeServicePromiseRef.current;
      runtimeServiceRef.current = null;
      runtimeServicePromiseRef.current = null;
      void (async () => {
        const service = currentService ?? (await pendingService);
        await service?.dispose();
      })().catch(() => undefined);
    };
  }, []);

  const disposeRuntimeService = useCallback(async () => {
    const pendingService = runtimeServicePromiseRef.current;
    runtimeServicePromiseRef.current = null;
    const service = runtimeServiceRef.current ?? (await pendingService);
    await service?.dispose();
    runtimeServiceRef.current = null;
  }, []);

  const getRuntimeService = useCallback(async () => {
    if (runtimeServiceRef.current) {
      return runtimeServiceRef.current;
    }

    runtimeServicePromiseRef.current ??= createDemoLlmRuntimeService();
    try {
      runtimeServiceRef.current = await runtimeServicePromiseRef.current;
      return runtimeServiceRef.current;
    } finally {
      runtimeServicePromiseRef.current = null;
    }
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
        const runtimeService = await getRuntimeService();
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
