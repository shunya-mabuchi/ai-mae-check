import type { Finding } from "@ai-mae-check/core";
import {
  classifyLlmError,
  createJsonParseFallbackMessage,
  type ContextAnalysisResult,
  type ContextRiskCandidate,
  isContextAnalysisExecutionError,
  type LlmExecutionProfileId,
  type LlmProgress,
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
    profileId: LlmExecutionProfileId;
    existingFindings: Finding[];
    onProgress: (progress: LlmProgress) => void;
  }
) => Promise<ContextAnalysisResult>;

export interface RunReviewLlmOptions {
  enabled: boolean;
  inputText: string;
  modelId: string;
  profileId: LlmExecutionProfileId;
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

export const LOCAL_CONTEXT_FALLBACK_MESSAGE =
  "AI文脈チェックは完了できませんでしたが、ブラウザ内の補助検出で注意候補を表示しています。";
export const LOW_RESOURCE_RETRY_MESSAGE = "GPU負荷を抑えてAI文脈チェックを再実行しています。";

function isActive(options: RunReviewLlmOptions): boolean {
  return options.isActive?.() ?? true;
}

function shouldRetryWithLowResource(result: ContextAnalysisResult, profileId: LlmExecutionProfileId): boolean {
  if (profileId === "low_resource" || !isContextAnalysisExecutionError(result)) {
    return false;
  }

  const detail = result.errorDetail;
  if (!detail) {
    return false;
  }

  if (detail.kind === "memory") {
    return true;
  }

  const technicalDetail = detail.technicalDetail?.toLowerCase() ?? "";
  if (detail.kind === "worker") {
    return technicalDetail.includes("already been disposed") || technicalDetail.includes("disposed object");
  }

  return (
    detail.kind === "webgpu" &&
    [
      "gpubuffer",
      "mapasync",
      "device lost",
      "device_hung",
      "dxgi_error_device_hung",
      "gpu constraints",
      "already been disposed",
      "disposed object"
    ].some((signal) => technicalDetail.includes(signal))
  );
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
  const analyzeWithProfile = (profileId: LlmExecutionProfileId) =>
    analyze(options.inputText, {
      modelId: options.modelId,
      profileId,
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

  try {
    let result = await analyzeWithProfile(options.profileId);

    if (shouldRetryWithLowResource(result, options.profileId) && isActive(options)) {
      options.llmStatus.textContent = LOW_RESOURCE_RETRY_MESSAGE;
      result = await analyzeWithProfile("low_resource");
    }

    if (!isActive(options)) {
      return;
    }

    if (isContextAnalysisExecutionError(result)) {
      if (result.candidates.length > 0) {
        applyReviewLlmResult(options, result);
        options.llmStatus.textContent = `${LOCAL_CONTEXT_FALLBACK_MESSAGE}\n${formatPasteReviewLlmStatusMessage(
          result.error ?? "AI文脈チェックを実行できませんでした。",
          result.errorDetail
        )}`;
        return;
      }

      const statusMessage = formatPasteReviewLlmStatusMessage(
        result.error ?? "AI文脈チェックを実行できませんでした。ルールベースの検出結果は引き続き利用できます。",
        result.errorDetail
      );
      options.llmStatus.textContent = statusMessage;
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
          : `${LOCAL_CONTEXT_FALLBACK_MESSAGE}\n${formatPasteReviewLlmStatusMessage(detail.message, detail)}`;
      return;
    }
    options.llmStatus.textContent = formatPasteReviewLlmStatusMessage(detail.message, detail);
  } finally {
    if (isActive(options)) {
      options.llmButton.removeAttribute("disabled");
    }
  }
}
