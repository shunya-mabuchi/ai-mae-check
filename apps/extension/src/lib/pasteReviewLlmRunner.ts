import type { Finding } from "@ai-mae-check/core";
import {
  classifyLlmError,
  type ContextAnalysisResult,
  type ContextRiskCandidate,
  isContextAnalysisExecutionError,
  type LlmProgress
} from "@ai-mae-check/llm";
import { analyzeContextWithBridge } from "./llmBridgeClient";
import {
  createPasteReviewLlmResultState,
  formatPasteReviewLlmStatusMessage,
  PASTE_REVIEW_LLM_DISABLED_MESSAGE,
  PASTE_REVIEW_LLM_LOADING_MESSAGE
} from "./pasteReviewLlmState";

type AnalyzePasteReviewContext = (
  inputText: string,
  options: {
    modelId: string;
    existingFindings: Finding[];
    onProgress: (progress: LlmProgress) => void;
  }
) => Promise<ContextAnalysisResult>;

export interface RunPasteReviewLlmOptions {
  enabled: boolean;
  inputText: string;
  modelId: string;
  existingFindings: Finding[];
  llmStatus: HTMLElement;
  llmButton: HTMLButtonElement;
  selectedCandidateIds: Set<string>;
  setCandidates: (candidates: ContextRiskCandidate[]) => void;
  render: () => void;
  analyze?: AnalyzePasteReviewContext;
}

export async function runPasteReviewLlm(options: RunPasteReviewLlmOptions): Promise<void> {
  if (!options.enabled) {
    options.llmStatus.textContent = PASTE_REVIEW_LLM_DISABLED_MESSAGE;
    return;
  }

  const analyze = options.analyze ?? analyzeContextWithBridge;
  options.llmButton.setAttribute("disabled", "true");
  options.llmStatus.textContent = PASTE_REVIEW_LLM_LOADING_MESSAGE;

  try {
    const result = await analyze(options.inputText, {
      modelId: options.modelId,
      existingFindings: options.existingFindings,
      onProgress: (progress: LlmProgress) => {
        options.llmStatus.textContent = progress.message;
      }
    });

    if (isContextAnalysisExecutionError(result)) {
      options.llmStatus.textContent = formatPasteReviewLlmStatusMessage(
        result.error ?? "AI文脈チェックを実行できませんでした。",
        result.errorDetail
      );
      return;
    }

    const resultState = createPasteReviewLlmResultState(result);
    options.setCandidates(resultState.candidates);
    options.selectedCandidateIds.clear();
    for (const candidateId of resultState.selectedCandidateIds) {
      options.selectedCandidateIds.add(candidateId);
    }

    options.llmStatus.textContent = resultState.statusMessage;
    options.render();
  } catch (error: unknown) {
    const detail = classifyLlmError(error);
    options.llmStatus.textContent = formatPasteReviewLlmStatusMessage(detail.message, detail);
  } finally {
    options.llmButton.removeAttribute("disabled");
  }
}
