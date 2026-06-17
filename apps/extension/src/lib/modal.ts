import {
  evaluateDlpPolicy,
  type DetectionResult
} from "@ai-mae-check/core";
import {
  classifyLlmError,
  type ContextRiskCandidate,
  isContextAnalysisExecutionError,
  type LlmProgress
} from "@ai-mae-check/llm";
import { pasteReviewModalCss } from "./modalStyles";
import {
  createPasteReviewFooterState,
  RAW_PASTE_BLOCKED_MESSAGE,
} from "./pasteReviewState";
import {
  createInitialSelectedFindingIds,
  resolvePasteReviewFindings,
} from "./pasteReviewSelection";
import { renderPasteReviewCandidateList, renderPasteReviewFindingList } from "./pasteReviewListRenderers";
import { createPasteReviewSummaryItems } from "./pasteReviewSummaryView";
import { createPasteReviewInsertText, createPasteReviewPreviewText } from "./pasteReviewTextTransform";
import {
  createPasteReviewLlmResultState,
  formatPasteReviewLlmStatusMessage,
  PASTE_REVIEW_LLM_DISABLED_MESSAGE,
  PASTE_REVIEW_LLM_INITIAL_MESSAGE,
  PASTE_REVIEW_LLM_LOADING_MESSAGE,
  shouldAutoRunPasteReviewLlm
} from "./pasteReviewLlmState";
import { createPasteReviewModalCopy, type PasteReviewModalMode } from "./pasteReviewModalCopy";
import type { AiMaeCheckSettings } from "./settings";
import { analyzeContextWithBridge } from "./llmBridgeClient";
import { createElement } from "./domElement";
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

    const overlay = createElement("div", "hm-overlay");
    const dialog = createElement("section", "hm-dialog");
    const header = createElement("header", "hm-header");
    header.append(createElement("h2", "hm-title", modalCopy.title));
    header.append(createElement("p", "hm-description", modalCopy.description));

    const policy = evaluateDlpPolicy(options.detection.findings);
    const rawPasteAllowed = !policy.requiresSanitization;
    const body = createElement("div", "hm-body");
    const summary = createElement("div", "hm-summary");
    for (const item of createPasteReviewSummaryItems(options.detection.summary)) {
      summary.append(createElement("div", item.className, item.text));
    }

    const grid = createElement("div", "hm-grid");
    const listPanel = createElement("div", "hm-panel");
    listPanel.append(createElement("h3", undefined, "検出項目一覧"));
    const list = createElement("div", "hm-list");
    listPanel.append(list);

    const previewPanel = createElement("div", "hm-panel");
    previewPanel.append(createElement("h3", undefined, "マスキング後プレビュー"));
    const preview = createElement("pre", "hm-preview");
    previewPanel.append(preview);

    grid.append(listPanel, previewPanel);

    const llmPanel = createElement("div", "hm-llm");
    llmPanel.append(createElement("h3", undefined, "WebLLMによる文脈チェック"));
    const llmStatus = createElement("p", "hm-llm-status", PASTE_REVIEW_LLM_INITIAL_MESSAGE);
    const candidateList = createElement("div");
    llmPanel.append(llmStatus, candidateList);

    body.append(summary, grid);
    body.append(llmPanel);

    const footer = createElement("footer", "hm-footer");
    const footerNote = createElement("p", "hm-footer-note");
    const maskButton = createElement("button", "hm-button hm-primary", modalCopy.maskButtonText);
    const llmButton = createElement("button", "hm-button hm-dark", "AI文脈チェックも実行");
    const rawButton = createElement("button", "hm-button", "そのまま貼り付け");
    const cancelButton = createElement("button", "hm-button", "キャンセル");
    footer.append(footerNote, maskButton, llmButton, rawButton, cancelButton);

    dialog.append(header, body, footer);
    overlay.append(dialog);
    shadow.append(overlay);

    let llmCandidates: ContextRiskCandidate[] = [];
    const selectedRuleFindingIds = createInitialSelectedFindingIds(options.detection.findings);
    const selectedCandidateIds = new Set<string>();

    const currentFindings = () => {
      return resolvePasteReviewFindings({
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
      renderPasteReviewFindingList(list, options.detection.findings, selectedRuleFindingIds, renderAfterSelectionChange);
      preview.textContent = createPasteReviewPreviewText(options.inputText, findings);
      renderPasteReviewCandidateList(candidateList, llmCandidates, selectedCandidateIds, renderAfterSelectionChange);
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
      if (!options.settings.llm.enabled) {
        llmStatus.textContent = PASTE_REVIEW_LLM_DISABLED_MESSAGE;
        return;
      }

      llmButton.setAttribute("disabled", "true");
      llmStatus.textContent = PASTE_REVIEW_LLM_LOADING_MESSAGE;

      try {
        const result = await analyzeContextWithBridge(options.inputText, {
          modelId: options.settings.llm.modelId,
          existingFindings: options.detection.findings,
          onProgress: (progress: LlmProgress) => {
            llmStatus.textContent = progress.message;
          }
        });

        if (isContextAnalysisExecutionError(result)) {
          llmStatus.textContent = formatPasteReviewLlmStatusMessage(
            result.error ?? "AI文脈チェックを実行できませんでした。",
            result.errorDetail
          );
          return;
        }

        const resultState = createPasteReviewLlmResultState(result);
        llmCandidates = resultState.candidates;
        selectedCandidateIds.clear();
        for (const candidateId of resultState.selectedCandidateIds) {
          selectedCandidateIds.add(candidateId);
        }

        llmStatus.textContent = resultState.statusMessage;
        render();
      } catch (error: unknown) {
        const detail = classifyLlmError(error);
        llmStatus.textContent = formatPasteReviewLlmStatusMessage(detail.message, detail);
      } finally {
        llmButton.removeAttribute("disabled");
      }
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
