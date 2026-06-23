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
import { isLlmBridgeModelReady } from "./llmBridgeClient";
import { createPasteReviewModalCopy, type PasteReviewModalMode } from "./pasteReviewModalCopy";
import { createPasteReviewModalElements } from "./pasteReviewModalElements";
import type { AiMaeCheckSettings } from "./settings";
import { createShadowHost } from "./shadowHost";
import { setupDialogAccessibility } from "./dialogAccessibility";

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
      dialog,
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
    let finished = false;

    const finish = (decision: ModalDecision) => {
      if (finished) {
        return;
      }
      finished = true;
      accessibility.dispose();
      cleanup();
      resolve(decision);
    };

    const accessibility = setupDialogAccessibility({
      overlay,
      dialog,
      initialFocus: maskButton,
      onCancel: () => finish({ type: "cancel" })
    });

    let llmCandidates: ContextRiskCandidate[] = [];
    let llmHasStarted = false;
    let llmRunning = false;
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

    const runLlm = async (source: "manual" | "auto") => {
      if (finished || llmRunning || (source === "auto" && llmHasStarted)) {
        return;
      }

      llmHasStarted = true;
      llmRunning = true;
      try {
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
      } finally {
        llmRunning = false;
      }
    };

    maskButton.addEventListener("click", () => {
      const findings = currentFindings();
      const maskedText = createPasteReviewInsertText(options.inputText, findings, mode);
      finish({ type: "insert", text: maskedText });
    });

    llmButton.addEventListener("click", () => {
      void runLlm("manual");
    });

    rawButton.addEventListener("click", () => {
      if (!rawPasteAllowed) {
        llmStatus.textContent = RAW_PASTE_BLOCKED_MESSAGE;
        return;
      }
      finish({ type: "insert", text: options.inputText });
    });

    cancelButton.addEventListener("click", () => {
      finish({ type: "cancel" });
    });

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        finish({ type: "cancel" });
      }
    });

    render();
    accessibility.activate();

    if (mode === "default" && options.settings.llm.enabled && options.settings.llm.mode === "auto") {
      void isLlmBridgeModelReady(options.settings.llm.modelId)
        .then((modelReady) => {
          if (!finished && shouldAutoRunPasteReviewLlm(mode, options.settings.llm, modelReady)) {
            void runLlm("auto");
          }
        })
        .catch(() => {
          // 準備状態の取得に失敗しても、手動ボタンとルールベース検出はそのまま使える。
        });
    }
  });
}
