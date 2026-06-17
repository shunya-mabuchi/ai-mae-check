import {
  evaluateDlpPolicy,
  type DetectionResult,
  type Finding
} from "@ai-mae-check/core";
import {
  classifyLlmError,
  type ContextRiskCandidate,
  isContextAnalysisExecutionError,
  type LlmProgress
} from "@ai-mae-check/llm";
import { pasteReviewModalCss } from "./modalStyles";
import {
  createPasteReviewActionState,
  RAW_PASTE_BLOCKED_MESSAGE,
  shouldDisablePasteReviewMaskAction
} from "./pasteReviewState";
import {
  createInitialSelectedCandidateIds,
  createInitialSelectedFindingIds,
  handlePasteReviewSelectionToggle,
  resolvePasteReviewFindings,
} from "./pasteReviewSelection";
import { createPasteReviewCandidateListView } from "./pasteReviewCandidateListView";
import { createPasteReviewFindingListView } from "./pasteReviewFindingListView";
import { createPasteReviewSummaryItems } from "./pasteReviewSummaryView";
import { createPasteReviewInsertText, createPasteReviewPreviewText } from "./pasteReviewTextTransform";
import {
  createPasteReviewLlmResultMessage,
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

function renderFindingList(
  container: HTMLElement,
  findings: Finding[],
  selectedFindingIds: Set<string>,
  onChange: () => void
): void {
  container.replaceChildren();
  const listView = createPasteReviewFindingListView(findings, selectedFindingIds);
  if (listView.emptyMessage) {
    container.append(createElement("p", "hm-message", listView.emptyMessage));
    return;
  }

  for (const view of listView.items) {
    const item = createElement("label", "hm-item");
    const wrapper = createElement("div", "hm-select-row");
    const checkbox = createElement("input") as HTMLInputElement;
    checkbox.type = "checkbox";
    checkbox.checked = view.selected;
    checkbox.addEventListener("change", () => {
      handlePasteReviewSelectionToggle({
        selectedIds: selectedFindingIds,
        id: view.id,
        checked: checkbox.checked,
        onChange
      });
    });

    const body = createElement("div");
    const meta = createElement("div", "hm-meta");
    meta.append(createElement("span", view.riskBadgeClassName, view.riskBadgeText));
    meta.append(createElement("strong", undefined, view.label));
    meta.append(createElement("span", "hm-message", view.sourceLabel));
    meta.append(createElement("span", "hm-message", view.selectionLabel));
    body.append(meta);
    body.append(createElement("code", "hm-text", view.text));
    body.append(createElement("p", "hm-message", view.message));
    wrapper.append(checkbox, body);
    item.append(wrapper);
    container.append(item);
  }
}

function renderCandidates(
  container: HTMLElement,
  candidates: ContextRiskCandidate[],
  selectedCandidateIds: Set<string>,
  onChange: () => void
): void {
  container.replaceChildren();
  const listView = createPasteReviewCandidateListView(candidates, selectedCandidateIds);
  if (listView.emptyMessage) {
    container.append(createElement("p", "hm-message", listView.emptyMessage));
    return;
  }

  for (const view of listView.items) {
    const label = createElement("label", "hm-candidate");
    const checkbox = createElement("input") as HTMLInputElement;
    checkbox.type = "checkbox";
    checkbox.checked = view.selected;
    checkbox.addEventListener("change", () => {
      handlePasteReviewSelectionToggle({
        selectedIds: selectedCandidateIds,
        id: view.id,
        checked: checkbox.checked,
        onChange
      });
    });

    const body = createElement("div");
    const meta = createElement("div", "hm-meta");
    meta.append(createElement("strong", undefined, view.label));
    meta.append(createElement("span", view.riskBadgeClassName, view.riskBadgeText));
    meta.append(createElement("span", "hm-message", view.confidenceText));
    meta.append(createElement("span", "hm-message", view.selectionLabel));
    body.append(meta);
    body.append(createElement("code", "hm-text", view.surface));
    body.append(createElement("p", "hm-message", view.reason));

    label.append(checkbox, body);
    container.append(label);
  }
}

export async function showPasteReviewModal(options: PasteReviewModalOptions): Promise<ModalDecision> {
  return new Promise((resolve) => {
    const mode = options.mode ?? "default";
    const modalCopy = createPasteReviewModalCopy(mode);
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = pasteReviewModalCss;
    shadow.append(style);

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
    document.documentElement.append(host);

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
      renderFindingList(list, options.detection.findings, selectedRuleFindingIds, renderAfterSelectionChange);
      preview.textContent = createPasteReviewPreviewText(options.inputText, findings);
      renderCandidates(candidateList, llmCandidates, selectedCandidateIds, renderAfterSelectionChange);
      maskButton.toggleAttribute("disabled", shouldDisablePasteReviewMaskAction(mode, findings.length));
      const actionState = createPasteReviewActionState(rawPasteAllowed);
      rawButton.textContent = actionState.rawButtonText;
      rawButton.toggleAttribute("disabled", actionState.rawButtonDisabled);
      rawButton.title = actionState.rawButtonTitle;
      footerNote.textContent = actionState.footerNote;
      footerNote.hidden = actionState.footerNote.length === 0;
    };

    const cleanup = () => {
      host.remove();
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

        llmCandidates = result.candidates;
        selectedCandidateIds.clear();
        for (const candidateId of createInitialSelectedCandidateIds(result.candidates)) {
          selectedCandidateIds.add(candidateId);
        }

        llmStatus.textContent = createPasteReviewLlmResultMessage(result.candidates.length, result.summary, result.errorDetail);
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
