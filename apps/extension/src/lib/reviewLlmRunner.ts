import type { Finding } from "@ai-mae-check/core";
import {
  classifyLlmError,
  type ContextAnalysisResult,
  type ContextRiskCandidate,
  isContextAnalysisExecutionError,
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
    maxCandidates: number;
    onProgress: (progress: LlmProgress) => void;
  }
) => Promise<ContextAnalysisResult>;

export interface RunReviewLlmOptions {
  enabled: boolean;
  inputText: string;
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

function isActive(options: RunReviewLlmOptions): boolean {
  return options.isActive?.() ?? true;
}

function applyResult(
  options: Pick<
    RunReviewLlmOptions,
    "selectedCandidateIds" | "setCandidates" | "setEmptyCandidateMessageVisible" | "render"
  >,
  result: Pick<ContextAnalysisResult, "candidates" | "summary" | "errorDetail">
) {
  const state = createPasteReviewLlmResultState(result);
  options.setCandidates(state.candidates);
  options.setEmptyCandidateMessageVisible?.(state.emptyCandidateMessageVisible);
  options.selectedCandidateIds.clear();
  for (const id of state.selectedCandidateIds) {
    options.selectedCandidateIds.add(id);
  }
  options.render();
  return state;
}

export async function runReviewLlm(options: RunReviewLlmOptions): Promise<void> {
  if (!isActive(options)) return;
  if (!options.enabled) {
    options.llmStatus.textContent = PASTE_REVIEW_LLM_DISABLED_MESSAGE;
    return;
  }

  options.llmButton.disabled = true;
  options.llmStatus.textContent = PASTE_REVIEW_LLM_LOADING_MESSAGE;
  options.setEmptyCandidateMessageVisible?.(false);
  options.render();

  try {
    const result = await (options.analyze ?? analyzeContextWithBridge)(options.inputText, {
      maxCandidates: 12,
      onProgress: (progress) => {
        if (isActive(options)) options.llmStatus.textContent = progress.message;
      }
    });
    if (!isActive(options)) return;

    const state = applyResult(options, result);
    if (isContextAnalysisExecutionError(result)) {
      options.llmStatus.textContent = `${LOCAL_CONTEXT_FALLBACK_MESSAGE}\n${formatPasteReviewLlmStatusMessage(
        result.error ?? "CPU文脈チェックを実行できませんでした。",
        result.errorDetail
      )}`;
      return;
    }
    options.llmStatus.textContent = result.warnings?.length
      ? `${state.statusMessage}\n一部のブラウザ内モデルは利用できませんでした。表示された候補を確認してください。`
      : state.statusMessage;
  } catch (error: unknown) {
    if (!isActive(options)) return;
    const detail = classifyLlmError(error);
    const candidates = mergeResidualContextCandidates(options.inputText, []);
    if (candidates.length > 0) {
      applyResult(options, {
        candidates,
        summary: LOCAL_CONTEXT_FALLBACK_MESSAGE,
        errorDetail: detail
      });
    }
    options.llmStatus.textContent = `${LOCAL_CONTEXT_FALLBACK_MESSAGE}\n${formatPasteReviewLlmStatusMessage(
      detail.message,
      detail
    )}`;
  } finally {
    if (isActive(options)) options.llmButton.disabled = false;
  }
}
