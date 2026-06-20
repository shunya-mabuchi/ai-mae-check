import { createElement } from "../lib/domElement";

export interface ConfirmModalSummaryItem {
  label: string;
  value: string;
}

export interface CreateConfirmModalElementsOptions {
  title: string;
  description: string;
  previewTitle: string;
  llmTitle: string;
  llmButtonLabel: string;
  llmButtonTitle: string;
  cancelButtonLabel: string;
  initialLlmMessage: string;
  initialStatusMessage: string;
  categoryPanelTitle: string;
  summaryItems: ConfirmModalSummaryItem[];
}

export interface ConfirmModalElements {
  overlay: HTMLDivElement;
  categoryList: HTMLDivElement;
  preview: HTMLPreElement;
  status: HTMLParagraphElement;
  llmStatus: HTMLParagraphElement;
  candidateList: HTMLDivElement;
  submitButton: HTMLButtonElement;
  llmButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
}

function createSummaryMetric(item: ConfirmModalSummaryItem): HTMLDivElement {
  const metric = createElement("div", "amc-metric");
  metric.append(createElement("span", undefined, item.label));
  metric.append(createElement("strong", undefined, item.value));
  return metric;
}

export function createConfirmModalElements(options: CreateConfirmModalElementsOptions): ConfirmModalElements {
  const overlay = createElement("div", "amc-overlay");
  const dialog = createElement("section", "amc-dialog");
  const header = createElement("header", "amc-header");
  header.append(createElement("h2", "amc-title", options.title));
  header.append(createElement("p", "amc-description", options.description));

  const body = createElement("div", "amc-body");
  const summary = createElement("div", "amc-summary");
  summary.append(...options.summaryItems.map(createSummaryMetric));

  const grid = createElement("div", "amc-grid");
  const categoryPanel = createElement("div", "amc-panel");
  categoryPanel.append(createElement("h3", undefined, options.categoryPanelTitle));
  const categoryList = createElement("div", "amc-categories");
  categoryPanel.append(categoryList);

  const transformPanel = createElement("div", "amc-panel");
  transformPanel.append(createElement("h3", undefined, options.previewTitle));
  const status = createElement("p", "amc-note", options.initialStatusMessage);
  const preview = createElement("pre", "amc-preview");

  const llmPanel = createElement("div", "amc-llm-panel");
  llmPanel.append(createElement("h3", undefined, options.llmTitle));
  const llmStatus = createElement("p", "amc-note", options.initialLlmMessage);
  const candidateList = createElement("div", "amc-candidates");
  llmPanel.append(llmStatus, candidateList);
  transformPanel.append(status, preview, llmPanel);

  const footer = createElement("footer", "amc-footer");
  const submitButton = createElement("button", "amc-button amc-primary") as HTMLButtonElement;
  const llmButton = createElement("button", "amc-button", options.llmButtonLabel) as HTMLButtonElement;
  llmButton.title = options.llmButtonTitle;
  const cancelButton = createElement("button", "amc-button", options.cancelButtonLabel) as HTMLButtonElement;
  footer.append(submitButton, llmButton, cancelButton);

  grid.append(categoryPanel, transformPanel);
  body.append(summary, grid);
  dialog.append(header, body, footer);
  overlay.append(dialog);

  return {
    overlay,
    categoryList,
    preview,
    status,
    llmStatus,
    candidateList,
    submitButton,
    llmButton,
    cancelButton
  };
}
