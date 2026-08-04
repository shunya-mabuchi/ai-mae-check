import { evaluateDlpPolicy } from "@ai-mae-check/core";
import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import {
  PASTE_REVIEW_LLM_INITIAL_MESSAGE,
  shouldAutoRunPasteReviewLlm
} from "./pasteReviewLlmState";
import {
  createPasteReviewFooterState,
  RAW_PASTE_BLOCKED_MESSAGE
} from "./pasteReviewState";
import type {
  PasteReviewDialogElements,
  PasteReviewModalDecision,
  PasteReviewModalOptions
} from "./pasteReviewModalTypes";
import {
  createInitialSelectedFindingIds,
  resolveReviewFindings
} from "./reviewSelection";
import {
  renderReviewCandidateList,
  renderReviewFindingList
} from "./reviewListRenderers";
import { runReviewLlm } from "./reviewLlmRunner";
import {
  createPasteReviewInsertText,
  createPasteReviewPreviewText
} from "./pasteReviewTextTransform";

export interface PasteReviewModalControllerOptions extends PasteReviewModalOptions {
  elements: PasteReviewDialogElements;
  close: (decision: PasteReviewModalDecision) => void;
  isClosed: () => boolean;
}

export interface PasteReviewModalController {
  dispose: () => void;
}

export function initializePasteReviewModalController(
  options: PasteReviewModalControllerOptions
): PasteReviewModalController {
  const mode = options.mode ?? "default";
  const policy = evaluateDlpPolicy(options.detection.findings);
  const rawPasteAllowed = !policy.requiresSanitization;
  const {
    list,
    preview,
    llmStatus,
    candidateList,
    footerNote,
    maskButton,
    llmButton,
    rawButton,
    cancelButton
  } = options.elements;
  let llmCandidates: ContextRiskCandidate[] = [];
  let llmEmptyCandidateMessageVisible = false;
  let llmHasStarted = false;
  let llmRunning = false;
  let disposed = false;
  const selectedRuleFindingIds = createInitialSelectedFindingIds(options.detection.findings);
  const selectedCandidateIds = new Set<string>();

  llmStatus.textContent = PASTE_REVIEW_LLM_INITIAL_MESSAGE;

  const isActive = () => !disposed && !options.isClosed();

  const currentFindings = () =>
    resolveReviewFindings({
      input: options.inputText,
      ruleFindings: options.detection.findings,
      selectedRuleFindingIds,
      candidates: llmCandidates,
      selectedCandidateIds
    });

  const render = () => {
    if (!isActive()) {
      return;
    }

    const findings = currentFindings();
    renderReviewFindingList(list, options.detection.findings, selectedRuleFindingIds, render);
    preview.textContent = createPasteReviewPreviewText(options.inputText, findings);
    renderReviewCandidateList(candidateList, llmCandidates, selectedCandidateIds, render, {
      showEmptyMessage: llmEmptyCandidateMessageVisible
    });
    const footerState = createPasteReviewFooterState({
      mode,
      selectedFindingCount: findings.length,
      rawPasteAllowed
    });
    maskButton.toggleAttribute("disabled", footerState.maskButtonDisabled);
    rawButton.textContent = footerState.rawButtonText;
    rawButton.toggleAttribute("disabled", footerState.rawButtonDisabled);
    rawButton.title = footerState.rawButtonTitle;
    footerNote.textContent = footerState.footerNote;
    footerNote.hidden = footerState.footerNoteHidden;
  };

  const runLlm = async (source: "manual" | "auto") => {
    if (!isActive() || llmRunning || (source === "auto" && llmHasStarted)) {
      return;
    }

    llmHasStarted = true;
    llmRunning = true;
    try {
      await runReviewLlm({
        enabled: options.settings.llm.enabled,
        inputText: options.inputText,
        existingFindings: options.detection.findings,
        llmStatus,
        llmButton,
        selectedCandidateIds,
        setCandidates: (candidates) => {
          llmCandidates = candidates;
        },
        setEmptyCandidateMessageVisible: (visible) => {
          llmEmptyCandidateMessageVisible = visible;
        },
        render,
        isActive
      });
    } finally {
      llmRunning = false;
    }
  };

  const handleMask = () => {
    const text = createPasteReviewInsertText(options.inputText, currentFindings(), mode);
    options.close({ type: "insert", text });
  };
  const handleLlm = () => {
    void runLlm("manual");
  };
  const handleRaw = () => {
    if (!rawPasteAllowed) {
      llmStatus.textContent = RAW_PASTE_BLOCKED_MESSAGE;
      return;
    }
    options.close({ type: "insert", text: options.inputText });
  };
  const handleCancel = () => {
    options.close({ type: "cancel" });
  };

  maskButton.addEventListener("click", handleMask);
  llmButton.addEventListener("click", handleLlm);
  rawButton.addEventListener("click", handleRaw);
  cancelButton.addEventListener("click", handleCancel);

  render();

  if (mode === "default" && options.settings.llm.enabled && options.settings.llm.mode === "auto") {
    if (shouldAutoRunPasteReviewLlm(mode, options.settings.llm)) {
      void runLlm("auto");
    }
  }

  return {
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      maskButton.removeEventListener("click", handleMask);
      llmButton.removeEventListener("click", handleLlm);
      rawButton.removeEventListener("click", handleRaw);
      cancelButton.removeEventListener("click", handleCancel);
    }
  };
}
