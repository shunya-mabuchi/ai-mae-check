import { createElement } from "./domElement";
import { createBrandIcon } from "./brandIcon";
import type { PasteReviewModalCopy } from "./pasteReviewModalCopy";
import type { PasteReviewSummaryItem } from "./pasteReviewSummaryView";

export interface PasteReviewModalElements {
  overlay: HTMLElement;
  dialog: HTMLElement;
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

const riskSummaryLabels = {
  critical: "重大リスク",
  high: "高リスク",
  medium: "中リスク",
  low: "低リスク"
} as const;

const riskSummaryOrder = ["critical", "high", "medium", "low"] as const;

function createSummaryCard(item: PasteReviewSummaryItem): HTMLElement {
  const metric = createElement("div", item.className);
  metric.append(createElement("span", "hm-count-label", item.label));
  metric.append(createElement("strong", undefined, `${item.count}`));
  return metric;
}

function createHeaderRiskBadge(items: PasteReviewSummaryItem[]): HTMLElement {
  const selected =
    riskSummaryOrder
      .map((level) => items.find((item) => item.level === level && item.count > 0))
      .find((item): item is PasteReviewSummaryItem => Boolean(item)) ??
    items.find((item) => item.level === "low") ??
    items[0];

  const level = selected?.level ?? "low";
  const count = selected?.count ?? 0;
  return createElement("div", `hm-risk-pill hm-risk-pill-${level}`, `${riskSummaryLabels[level]} ${count}件`);
}

function createTrustStrip(className: string): HTMLElement {
  const trustStrip = createElement("div", className);
  trustStrip.append(
    createElement("span", undefined, "ブラウザ内で実行"),
    createElement("span", undefined, "外部LLM APIへ送信なし"),
    createElement("span", undefined, "本文保存なし")
  );
  return trustStrip;
}

export function createPasteReviewModalElements(
  options: CreatePasteReviewModalElementsOptions
): PasteReviewModalElements {
  const overlay = createElement("div", "hm-overlay");
  const dialog = createElement("section", "hm-dialog");
  dialog.setAttribute("aria-label", options.modalCopy.title);
  const header = createElement("header", "hm-header");
  const headerTop = createElement("div", "hm-header-top");
  const brand = createElement("div", "hm-brand");
  brand.append(createBrandIcon("hm-brand-mark"));
  brand.append(createElement("h2", "hm-brand-name", "AIまえチェック"));
  const modeBadge = createElement("span", "hm-mode-badge", "貼り付け前チェック");
  headerTop.append(brand, modeBadge, createHeaderRiskBadge(options.summaryItems));
  header.append(headerTop);
  header.append(createElement("h3", "hm-title", options.modalCopy.title));
  header.append(createElement("p", "hm-description", options.modalCopy.description));

  const body = createElement("div", "hm-body");
  const summary = createElement("div", "hm-summary");
  summary.setAttribute("aria-label", "リスク件数");
  for (const item of options.summaryItems) {
    summary.append(createSummaryCard(item));
  }

  const grid = createElement("div", "hm-grid");
  const listPanel = createElement("div", "hm-panel");
  listPanel.append(createElement("h3", undefined, "検出された項目"));
  listPanel.append(createElement("p", "hm-panel-caption", "チェックを外した項目は安全化対象から外れます。"));
  const list = createElement("div", "hm-list");
  list.setAttribute("aria-label", "検出項目一覧");
  listPanel.append(list);

  const previewPanel = createElement("div", "hm-panel");
  previewPanel.append(createElement("h3", undefined, "安全化プレビュー"));
  previewPanel.append(createElement("p", "hm-panel-caption", "この内容が入力欄に反映されます。"));
  const preview = createElement("pre", "hm-preview");
  preview.setAttribute("aria-label", "安全化プレビュー");
  previewPanel.append(preview, createTrustStrip("hm-preview-trust"));

  grid.append(listPanel, previewPanel);

  const llmPanel = createElement("div", "hm-llm");
  llmPanel.append(createElement("h3", undefined, "AI文脈チェック"));
  const llmStatus = createElement("p", "hm-llm-status", options.initialLlmMessage);
  llmStatus.setAttribute("role", "status");
  llmStatus.setAttribute("aria-live", "polite");
  const candidateList = createElement("div");
  candidateList.setAttribute("aria-label", "AI文脈チェック候補");
  llmPanel.append(llmStatus, candidateList);

  body.append(summary, grid);
  body.append(llmPanel);

  const footer = createElement("footer", "hm-footer");
  const footerNote = createElement("p", "hm-footer-note");
  const maskButton = createElement("button", "hm-button hm-primary", options.modalCopy.maskButtonText);
  const llmButton = createElement("button", "hm-button hm-secondary", "AI文脈チェックも実行");
  const rawButton = createElement("button", "hm-button hm-secondary", "そのまま貼り付け");
  const cancelButton = createElement("button", "hm-button hm-ghost", "キャンセル");
  for (const button of [maskButton, llmButton, rawButton, cancelButton]) {
    button.type = "button";
  }
  const footerActions = createElement("div", "hm-footer-actions");
  footerActions.append(cancelButton, rawButton, llmButton, maskButton);
  footer.append(footerNote, footerActions);

  dialog.append(header, body, footer);
  overlay.append(dialog);

  return {
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
  };
}
