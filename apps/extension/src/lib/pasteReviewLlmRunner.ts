import type { Finding } from "@ai-mae-check/core";
import {
  classifyLlmError,
  createJsonParseFallbackMessage,
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

function applyPasteReviewLlmResult(
  options: Pick<RunPasteReviewLlmOptions, "selectedCandidateIds" | "setCandidates" | "render">,
  result: Pick<ContextAnalysisResult, "candidates" | "summary" | "errorDetail">
): ReturnType<typeof createPasteReviewLlmResultState> {
  const resultState = createPasteReviewLlmResultState(result);
  options.setCandidates(resultState.candidates);
  options.selectedCandidateIds.clear();
  for (const candidateId of resultState.selectedCandidateIds) {
    options.selectedCandidateIds.add(candidateId);
  }
  options.render();
  return resultState;
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

    const resultState = applyPasteReviewLlmResult(options, result);
    options.llmStatus.textContent = resultState.statusMessage;
  } catch (error: unknown) {
    const detail = classifyLlmError(error);
    if (detail.kind === "json_parse") {
      const candidates = mergeResidualContextCandidates(options.inputText, []);
      const resultState = applyPasteReviewLlmResult(options, {
        candidates,
        summary: createJsonParseFallbackMessage(candidates.length),
        errorDetail: detail
      });
      options.llmStatus.textContent = resultState.statusMessage;
      return;
    }
    options.llmStatus.textContent = formatPasteReviewLlmStatusMessage(detail.message, detail);
  } finally {
    options.llmButton.removeAttribute("disabled");
  }
}
