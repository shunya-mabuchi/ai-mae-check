import { createElement } from "./domElement";
import type { PasteReviewModalCopy } from "./pasteReviewModalCopy";
import type { PasteReviewSummaryItem } from "./pasteReviewSummaryView";

export interface PasteReviewModalElements {
  overlay: HTMLElement;
  list: HTMLElement;
  preview: HTMLPreElement;
  llmStatus: HTMLElement;
  candidateList: HTMLElement;
  footerNote: HTMLElement;
  maskButton: HTMLButtonElement;
  llmButton: HTMLButtonElement;
  rawButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
}

export interface CreatePasteReviewModalElementsOptions {
  modalCopy: PasteReviewModalCopy;
  summaryItems: PasteReviewSummaryItem[];
  initialLlmMessage: string;
}

export function createPasteReviewModalElements(
  options: CreatePasteReviewModalElementsOptions
): PasteReviewModalElements {
  const overlay = createElement("div", "hm-overlay");
  const dialog = createElement("section", "hm-dialog");
  const header = createElement("header", "hm-header");
  header.append(createElement("h2", "hm-title", options.modalCopy.title));
  header.append(createElement("p", "hm-description", options.modalCopy.description));

  const body = createElement("div", "hm-body");
  const summary = createElement("div", "hm-summary");
  for (const item of options.summaryItems) {
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
  const llmStatus = createElement("p", "hm-llm-status", options.initialLlmMessage);
  const candidateList = createElement("div");
  llmPanel.append(llmStatus, candidateList);

  body.append(summary, grid);
  body.append(llmPanel);

  const footer = createElement("footer", "hm-footer");
  const footerNote = createElement("p", "hm-footer-note");
  const maskButton = createElement("button", "hm-button hm-primary", options.modalCopy.maskButtonText);
  const llmButton = createElement("button", "hm-button hm-dark", "AI文脈チェックも実行");
  const rawButton = createElement("button", "hm-button", "そのまま貼り付け");
  const cancelButton = createElement("button", "hm-button", "キャンセル");
  footer.append(footerNote, maskButton, llmButton, rawButton, cancelButton);

  dialog.append(header, body, footer);
  overlay.append(dialog);

  return {
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
  };
}
