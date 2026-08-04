import type { Finding } from "@ai-mae-check/core";
import {
  classifyLlmError,
  createJsonParseFallbackMessage,
  type ContextAnalysisResult,
  type ContextRiskCandidate,
  getLlmExecutionProfile,
  isContextAnalysisExecutionError,
  type LlmExecutionProfileId,
  type LlmProgress,
  mergeResidualContextCandidates
} from "@ai-mae-check/llm";
import { analyzeContextWithBridge, analyzeContextWithWasmBridge } from "./llmBridgeClient";
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

type AnalyzeWasmReviewContext = (
  inputText: string,
  options: {
    maxCandidates: number;
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
  analyzeWasm?: AnalyzeWasmReviewContext;
}

export const LOCAL_CONTEXT_FALLBACK_MESSAGE =
  "AI文脈チェックは完了できませんでしたが、ブラウザ内の補助検出で注意候補を表示しています。";
export const LOW_RESOURCE_RETRY_MESSAGE = "GPU負荷を抑えてAI文脈チェックを再実行しています。";
export const WASM_CONTEXT_FALLBACK_START_MESSAGE =
  "WebLLMを利用できないため、WebGPUを使わないCPU文脈チェックへ切り替えています。";
export const WASM_CONTEXT_FALLBACK_FOUND_MESSAGE =
  "WebLLMは利用できませんでしたが、CPUによる文脈チェックで注意候補が見つかりました。";
export const WASM_CONTEXT_FALLBACK_EMPTY_MESSAGE =
  "WebLLMは利用できませんでしたが、CPUによる文脈チェックでは追加候補は見つかりませんでした。ただし、安全を保証するものではありません。";

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

function shouldUseWasmFallback(result: ContextAnalysisResult): boolean {
  if (!isContextAnalysisExecutionError(result)) {
    return false;
  }

  return ["webgpu", "memory", "worker", "model_configuration"].includes(
    result.errorDetail?.kind ?? "unknown"
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
  const analyzeWasm = options.analyzeWasm ?? analyzeContextWithWasmBridge;
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

    if (shouldUseWasmFallback(result) && isActive(options)) {
      const webLlmResult = result;
      options.llmStatus.textContent = WASM_CONTEXT_FALLBACK_START_MESSAGE;
      const profile = getLlmExecutionProfile("low_resource");
      const wasmResult = await analyzeWasm(options.inputText, {
        maxCandidates: profile.maxCandidates,
        onProgress: (progress) => {
          if (isActive(options)) {
            options.llmStatus.textContent = progress.message;
          }
        }
      });

      if (!isActive(options)) {
        return;
      }

      if (!isContextAnalysisExecutionError(wasmResult)) {
        applyReviewLlmResult(options, wasmResult);
        options.llmStatus.textContent =
          wasmResult.candidates.length > 0
            ? WASM_CONTEXT_FALLBACK_FOUND_MESSAGE
            : WASM_CONTEXT_FALLBACK_EMPTY_MESSAGE;
        return;
      }

      if (wasmResult.candidates.length > 0) {
        applyReviewLlmResult(options, wasmResult);
      }
      options.llmStatus.textContent = `${LOCAL_CONTEXT_FALLBACK_MESSAGE}\n${formatPasteReviewLlmStatusMessage(
        webLlmResult.error ?? "WebLLMによるAI文脈チェックを実行できませんでした。",
        webLlmResult.errorDetail
      )}\n${formatPasteReviewLlmStatusMessage(
        wasmResult.error ?? "CPUによる文脈チェックを実行できませんでした。",
        wasmResult.errorDetail
      )}`;
      return;
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
