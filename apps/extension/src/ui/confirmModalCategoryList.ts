import { createElement } from "../lib/domElement";
import { riskLabels, type CategoryGroup, updateCategorySelection } from "./confirmModalState";

export interface RenderConfirmModalCategoryListOptions {
  container: HTMLElement;
  groups: CategoryGroup[];
  selectedFindingIds: Set<string>;
  onChange: () => void;
}

export function renderConfirmModalCategoryList(options: RenderConfirmModalCategoryListOptions): void {
  options.container.replaceChildren();

  for (const group of options.groups) {
    const card = createElement("section", "amc-category");
    const main = createElement("label", "amc-category-main");
    const checkbox = createElement("input") as HTMLInputElement;
    checkbox.type = "checkbox";
    checkbox.checked = group.findingIds.every((id) => options.selectedFindingIds.has(id));
    checkbox.disabled = group.locked;
    checkbox.addEventListener("change", () => {
      updateCategorySelection(options.selectedFindingIds, group.findingIds, checkbox.checked);
      options.onChange();
    });

    const content = createElement("div");
    const heading = createElement("div", "amc-category-heading");
    heading.append(createElement("span", "amc-category-title", group.label));
    heading.append(createElement("span", `amc-badge amc-${group.riskLevel}`, `危険度: ${riskLabels[group.riskLevel]}`));
    heading.append(createElement("span", "amc-badge", `${group.count}件`));
    if (group.locked) {
      heading.append(createElement("span", "amc-badge amc-high", "置換必須"));
    }

    content.append(heading);
    content.append(
      createElement(
        "p",
        "amc-note",
        group.locked
          ? "このカテゴリは置換後の送信から外せません。"
          : "必要に応じて置換対象から外せます。"
      )
    );

    const details = createElement("details", "amc-details");
    details.append(createElement("summary", undefined, "詳細を見る"));
    for (const finding of group.findings) {
      const findingItem = createElement("div", "amc-finding");
      findingItem.append(createElement("strong", undefined, finding.label));
      findingItem.append(createElement("code", "amc-code", finding.text));
      findingItem.append(createElement("p", "amc-note", finding.message));
      details.append(findingItem);
    }

    content.append(details);
    main.append(checkbox, content);
    card.append(main);
    options.container.append(card);
  }
}
