import type { Finding } from "@ai-mae-check/core";
import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import { createElement } from "./domElement";
import { createPasteReviewCandidateListView } from "./pasteReviewCandidateListView";
import { createPasteReviewFindingListView } from "./pasteReviewFindingListView";
import { handleReviewSelectionToggle } from "./reviewSelection";

export function renderReviewFindingList(
  container: HTMLElement,
  findings: Finding[],
  selectedFindingIds: Set<string>,
  onChange: () => void
): void {
  container.replaceChildren();
  const listView = createPasteReviewFindingListView(findings, selectedFindingIds);
  if (listView.emptyMessage) {
    container.append(createElement("p", "review-message", listView.emptyMessage));
    return;
  }

  for (const view of listView.items) {
    const item = createElement("label", "review-item");
    const wrapper = createElement("div", "review-select-row");
    const checkbox = createElement("input") as HTMLInputElement;
    checkbox.type = "checkbox";
    checkbox.checked = view.selected;
    checkbox.addEventListener("change", () => {
      handleReviewSelectionToggle({
        selectedIds: selectedFindingIds,
        id: view.id,
        checked: checkbox.checked,
        onChange
      });
    });

    const body = createElement("div");
    const meta = createElement("div", "review-meta");
    meta.append(createElement("span", view.riskBadgeClassName, view.riskBadgeText));
    meta.append(createElement("strong", undefined, view.label));
    meta.append(createElement("span", "review-message", view.sourceLabel));
    meta.append(createElement("span", "review-message", view.selectionLabel));
    body.append(meta);
    body.append(createElement("code", "review-text", view.text));
    body.append(createElement("p", "review-message", view.message));
    wrapper.append(checkbox, body);
    item.append(wrapper);
    container.append(item);
  }
}

export function renderReviewCandidateList(
  container: HTMLElement,
  candidates: ContextRiskCandidate[],
  selectedCandidateIds: Set<string>,
  onChange: () => void
): void {
  container.replaceChildren();
  const listView = createPasteReviewCandidateListView(candidates, selectedCandidateIds);
  if (listView.emptyMessage) {
    container.append(createElement("p", "review-message", listView.emptyMessage));
    return;
  }

  for (const view of listView.items) {
    const label = createElement("label", "review-candidate");
    const checkbox = createElement("input") as HTMLInputElement;
    checkbox.type = "checkbox";
    checkbox.checked = view.selected;
    checkbox.addEventListener("change", () => {
      handleReviewSelectionToggle({
        selectedIds: selectedCandidateIds,
        id: view.id,
        checked: checkbox.checked,
        onChange
      });
    });

    const body = createElement("div");
    const meta = createElement("div", "review-meta");
    meta.append(createElement("strong", undefined, view.label));
    meta.append(createElement("span", view.riskBadgeClassName, view.riskBadgeText));
    meta.append(createElement("span", "review-message", view.confidenceText));
    meta.append(createElement("span", "review-message", view.selectionLabel));
    body.append(meta);
    body.append(createElement("code", "review-text", view.surface));
    body.append(createElement("p", "review-message", view.reason));

    label.append(checkbox, body);
    container.append(label);
  }
}
