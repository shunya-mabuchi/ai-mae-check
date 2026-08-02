import type { Finding } from "@ai-mae-check/core";
import {
  classifyLlmError,
  createJsonParseFallbackMessage,
  type ContextAnalysisResult,
  type ContextRiskCandidate,
  isContextAnalysisExecutionError,
  type LlmProgress,
  LOW_VRAM_MODEL_ID,
  mergeResidualContextCandidates
} from "@ai-mae-check/llm";
import { analyzeContextWithBridge } from "./llmBridgeClient";
import {
  createPasteReviewLlmResultState,
  formatPasteReviewLlmStatusMessage,
  PASTE_REVIEW_LLM_DISABLED_MESSAGE,
  PASTE_REVIEW_LLM_LOADING_MESSAGE
} from "./pasteReviewLlmState";

type AnalyzeReviewContext = (
  inputText: string,
  options: {
    modelId: string;
    existingFindings: Finding[];
    onProgress: (progress: LlmProgress) => void;
  }
) => Promise<ContextAnalysisResult>;

export interface RunReviewLlmOptions {
  enabled: boolean;
  inputText: string;
  modelId: string;
  existingFindings: Finding[];
  llmStatus: HTMLElement;
  llmButton: HTMLButtonElement;
  selectedCandidateIds: Set<string>;
  setCandidates: (candidates: ContextRiskCandidate[]) => void;
  setEmptyCandidateMessageVisible?: (visible: boolean) => void;
  render: () => void;
  isActive?: () => boolean;
  analyze?: AnalyzeReviewContext;
}

export const LOW_VRAM_RETRY_MESSAGE =
  "GPU負荷を抑えた互換モデルでAI文脈チェックを再試行しています。";
export const LOCAL_CONTEXT_FALLBACK_MESSAGE =
  "AI文脈チェックは完了できませんでしたが、ブラウザ内の補助検出で注意候補を表示しています。";
export const STANDARD_AND_LOW_RESOURCE_FALLBACK_MESSAGE =
  "標準モデルと低負荷モデルの実行を完了できなかったため、ブラウザ内の補助検出だけで注意候補を表示しています。";
export const LOW_RESOURCE_FALLBACK_MESSAGE =
  "低負荷モデルの実行を完了できなかったため、ブラウザ内の補助検出だけで注意候補を表示しています。";

function includesGpuRuntimeFailure(value: string | undefined): boolean {
  const normalized = value?.toLowerCase() ?? "";
  return [
    "device lost",
    "device_hung",
    "dxgi_error_device_hung",
    "getdeviceremovedreason",
    "gpu execution",
    "gpu実行が中断"
  ].some((pattern) => normalized.includes(pattern));
}

export function shouldRetryWithLowVramModel(
  result: Pick<ContextAnalysisResult, "error" | "errorDetail">,
  requestedModelId: string
): boolean {
  if (requestedModelId === LOW_VRAM_MODEL_ID || !isContextAnalysisExecutionError(result)) {
    return false;
  }

  if (result.errorDetail?.kind === "memory") {
    return true;
  }

  if (result.errorDetail?.kind !== "webgpu") {
    return false;
  }

  return [
    result.error,
    result.errorDetail.message,
    result.errorDetail.hint,
    result.errorDetail.technicalDetail
  ].some(includesGpuRuntimeFailure);
}

function isActive(options: RunReviewLlmOptions): boolean {
  return options.isActive?.() ?? true;
}

function fallbackMessage(modelId: string, retriedWithLowVramModel: boolean): string {
  if (retriedWithLowVramModel) {
    return STANDARD_AND_LOW_RESOURCE_FALLBACK_MESSAGE;
  }

  return modelId === LOW_VRAM_MODEL_ID
    ? LOW_RESOURCE_FALLBACK_MESSAGE
    : LOCAL_CONTEXT_FALLBACK_MESSAGE;
}

function applyReviewLlmResult(
  options: Pick<RunReviewLlmOptions, "selectedCandidateIds" | "setCandidates" | "setEmptyCandidateMessageVisible" | "render">,
  result: Pick<ContextAnalysisResult, "candidates" | "summary" | "errorDetail">
): ReturnType<typeof createPasteReviewLlmResultState> {
  const resultState = createPasteReviewLlmResultState(result);
  options.setCandidates(resultState.candidates);
  options.setEmptyCandidateMessageVisible?.(resultState.emptyCandidateMessageVisible);
  options.selectedCandidateIds.clear();
  for (const candidateId of resultState.selectedCandidateIds) {
    options.selectedCandidateIds.add(candidateId);
  }
  options.render();
  return resultState;
}

export async function runReviewLlm(options: RunReviewLlmOptions): Promise<void> {
  if (!isActive(options)) {
    return;
  }

  if (!options.enabled) {
    options.llmStatus.textContent = PASTE_REVIEW_LLM_DISABLED_MESSAGE;
    return;
  }

  const analyze = options.analyze ?? analyzeContextWithBridge;
  const analyzeWithModel = (modelId: string) =>
    analyze(options.inputText, {
      modelId,
      existingFindings: options.existingFindings,
      onProgress: (progress: LlmProgress) => {
        if (isActive(options)) {
          options.llmStatus.textContent = progress.message;
        }
      }
    });
  options.llmButton.setAttribute("disabled", "true");
  options.llmStatus.textContent = PASTE_REVIEW_LLM_LOADING_MESSAGE;
  if (options.setEmptyCandidateMessageVisible) {
    options.setEmptyCandidateMessageVisible(false);
    options.render();
  }

  let retriedWithLowVramModel = false;

  try {
    let result = await analyzeWithModel(options.modelId);

    if (!isActive(options)) {
      return;
    }

    if (shouldRetryWithLowVramModel(result, options.modelId)) {
      retriedWithLowVramModel = true;
      options.llmStatus.textContent = LOW_VRAM_RETRY_MESSAGE;
      result = await analyzeWithModel(LOW_VRAM_MODEL_ID);

      if (!isActive(options)) {
        return;
      }
    }

    if (isContextAnalysisExecutionError(result)) {
      if (result.candidates.length > 0) {
        applyReviewLlmResult(options, result);
        options.llmStatus.textContent = `${fallbackMessage(options.modelId, retriedWithLowVramModel)}\n${formatPasteReviewLlmStatusMessage(
          result.error ?? "AI文脈チェックを実行できませんでした。",
          result.errorDetail
        )}`;
        return;
      }

      const statusMessage = formatPasteReviewLlmStatusMessage(
        result.error ?? "AI文脈チェックを実行できませんでした。ルールベースの検出結果は引き続き利用できます。",
        result.errorDetail
      );
      options.llmStatus.textContent =
        retriedWithLowVramModel || options.modelId === LOW_VRAM_MODEL_ID
          ? `${fallbackMessage(options.modelId, retriedWithLowVramModel)}\n${statusMessage}`
          : statusMessage;
      return;
    }

    const resultState = applyReviewLlmResult(options, result);
    options.llmStatus.textContent = resultState.statusMessage;
  } catch (error: unknown) {
    if (!isActive(options)) {
      return;
    }
    const detail = classifyLlmError(error);
    const candidates = mergeResidualContextCandidates(options.inputText, []);
    if (detail.kind === "json_parse" || candidates.length > 0) {
      const resultState = applyReviewLlmResult(options, {
        candidates,
        summary:
          detail.kind === "json_parse"
            ? createJsonParseFallbackMessage(candidates.length)
            : LOCAL_CONTEXT_FALLBACK_MESSAGE,
        errorDetail: detail
      });
      options.llmStatus.textContent =
        detail.kind === "json_parse"
          ? resultState.statusMessage
          : `${fallbackMessage(options.modelId, retriedWithLowVramModel)}\n${formatPasteReviewLlmStatusMessage(detail.message, detail)}`;
      return;
    }
    options.llmStatus.textContent = formatPasteReviewLlmStatusMessage(detail.message, detail);
  } finally {
    if (isActive(options)) {
      options.llmButton.removeAttribute("disabled");
    }
  }
}
