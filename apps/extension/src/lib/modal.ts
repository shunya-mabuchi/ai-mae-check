import {
  evaluateDlpPolicy,
  type DetectionResult
} from "@ai-mae-check/core";
import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import { pasteReviewModalCss } from "./modalStyles";
import {
  createPasteReviewFooterState,
  RAW_PASTE_BLOCKED_MESSAGE,
} from "./pasteReviewState";
import {
  createInitialSelectedFindingIds,
  resolveReviewFindings,
} from "./reviewSelection";
import { renderReviewCandidateList, renderReviewFindingList } from "./reviewListRenderers";
import { createPasteReviewSummaryItems } from "./pasteReviewSummaryView";
import { createPasteReviewInsertText, createPasteReviewPreviewText } from "./pasteReviewTextTransform";
import {
  PASTE_REVIEW_LLM_INITIAL_MESSAGE,
  shouldAutoRunPasteReviewLlm
} from "./pasteReviewLlmState";
import { runReviewLlm } from "./reviewLlmRunner";
import { createPasteReviewModalCopy, type PasteReviewModalMode } from "./pasteReviewModalCopy";
import { createPasteReviewModalElements } from "./pasteReviewModalElements";
import type { AiMaeCheckSettings } from "./settings";
import { createShadowHost } from "./shadowHost";

type ModalDecision =
  | {
      type: "insert";
      text: string;
    }
  | {
      type: "cancel";
    };

interface PasteReviewModalOptions {
  inputText: string;
  detection: DetectionResult;
  settings: AiMaeCheckSettings;
  mode?: PasteReviewModalMode;
}

export async function showPasteReviewModal(options: PasteReviewModalOptions): Promise<ModalDecision> {
  return new Promise((resolve) => {
    const mode = options.mode ?? "default";
    const modalCopy = createPasteReviewModalCopy(mode);
    const { shadow, cleanup } = createShadowHost(pasteReviewModalCss);

    const policy = evaluateDlpPolicy(options.detection.findings);
    const rawPasteAllowed = !policy.requiresSanitization;
    const {
      overlay,
      list,
      preview,
      llmStatus,
      candidateList,
      footerNote,
      maskButton,
      llmButton,
      rawButton,
      cancelButton
    } = createPasteReviewModalElements({
      modalCopy,
      summaryItems: createPasteReviewSummaryItems(options.detection.summary),
      initialLlmMessage: PASTE_REVIEW_LLM_INITIAL_MESSAGE
    });
    shadow.append(overlay);

    let llmCandidates: ContextRiskCandidate[] = [];
    const selectedRuleFindingIds = createInitialSelectedFindingIds(options.detection.findings);
    const selectedCandidateIds = new Set<string>();

    const currentFindings = () => {
      return resolveReviewFindings({
        input: options.inputText,
        ruleFindings: options.detection.findings,
        selectedRuleFindingIds,
        candidates: llmCandidates,
        selectedCandidateIds
      });
    };

    const renderAfterSelectionChange = () => {
      render();
    };

    const render = () => {
      const findings = currentFindings();
      renderReviewFindingList(list, options.detection.findings, selectedRuleFindingIds, renderAfterSelectionChange);
      preview.textContent = createPasteReviewPreviewText(options.inputText, findings);
      renderReviewCandidateList(candidateList, llmCandidates, selectedCandidateIds, renderAfterSelectionChange);
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

    const runLlm = async () => {
      await runReviewLlm({
        enabled: options.settings.llm.enabled,
        inputText: options.inputText,
        modelId: options.settings.llm.modelId,
        existingFindings: options.detection.findings,
        llmStatus,
        llmButton,
        selectedCandidateIds,
        setCandidates: (candidates) => {
          llmCandidates = candidates;
        },
        render
      });
    };

    maskButton.addEventListener("click", () => {
      const findings = currentFindings();
      const maskedText = createPasteReviewInsertText(options.inputText, findings, mode);
      cleanup();
      resolve({ type: "insert", text: maskedText });
    });

    llmButton.addEventListener("click", () => {
      void runLlm();
    });

    rawButton.addEventListener("click", () => {
      if (!rawPasteAllowed) {
        llmStatus.textContent = RAW_PASTE_BLOCKED_MESSAGE;
        return;
      }
      cleanup();
      resolve({ type: "insert", text: options.inputText });
    });

    cancelButton.addEventListener("click", () => {
      cleanup();
      resolve({ type: "cancel" });
    });

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        cleanup();
        resolve({ type: "cancel" });
      }
    });

    render();

    if (shouldAutoRunPasteReviewLlm(mode, options.settings.llm)) {
      void runLlm();
    }
  });
}
