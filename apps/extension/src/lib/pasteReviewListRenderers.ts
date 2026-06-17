import type { Finding } from "@ai-mae-check/core";
import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import { createPasteReviewCandidateListView } from "./pasteReviewCandidateListView";
import { createPasteReviewFindingListView } from "./pasteReviewFindingListView";
import { handlePasteReviewSelectionToggle } from "./pasteReviewSelection";
import { createElement } from "./domElement";

export function renderPasteReviewFindingList(
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

export function renderPasteReviewCandidateList(
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
