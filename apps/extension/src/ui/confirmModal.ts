import {
  evaluateDlpPolicy,
  type DetectionResult,
  type TransformMode
} from "@ai-mae-check/core";
import {
  canSubmitSelection,
  createCategoryGroups,
  createConfirmedText,
  decisionLabels,
  riskLabels,
  selectedFindings,
  transformModeOptions,
  updateCategorySelection
} from "./confirmModalState";
import { confirmModalCss } from "./styles";
import { createElement } from "../lib/domElement";
import { createShadowHost } from "../lib/shadowHost";

export type ConfirmModalDecision =
  | {
      type: "submit";
      text: string;
    }
  | {
      type: "edit";
    }
  | {
      type: "cancel";
    };

export interface SendConfirmModalOptions {
  inputText: string;
  detection: DetectionResult;
  defaultMode?: TransformMode;
}

export async function showSendConfirmModal(options: SendConfirmModalOptions): Promise<ConfirmModalDecision> {
  return new Promise((resolve) => {
    const policy = evaluateDlpPolicy(options.detection.findings);
    const groups = createCategoryGroups(options.detection.findings, policy);
    const selectedFindingIds = new Set(options.detection.findings.map((finding) => finding.id));
    let mode: TransformMode = options.defaultMode ?? "mask";

    const { shadow, cleanup } = createShadowHost(confirmModalCss);

    const overlay = createElement("div", "amc-overlay");
    const dialog = createElement("section", "amc-dialog");
    const header = createElement("header", "amc-header");
    header.append(createElement("h2", "amc-title", "送信前に安全化しますか？"));
    header.append(
      createElement(
        "p",
        "amc-description",
        policy.requiresSanitization
          ? "高リスクまたはSecret Guard対象が含まれるため、安全化なしでは送信できません。"
          : "注意が必要なカテゴリを確認できます。不要なカテゴリは詳細から外して、そのまま送信することもできます。"
      )
    );

    const body = createElement("div", "amc-body");
    const summary = createElement("div", "amc-summary");
    summary.append(createElement("div", "amc-metric", `判定\n${decisionLabels[policy.risk.level]}`));
    summary.append(createElement("div", "amc-metric", `スコア\n${policy.risk.score}`));
    summary.append(createElement("div", "amc-metric", `カテゴリ\n${groups.length}`));
    summary.append(createElement("div", "amc-metric", `検出\n${options.detection.findings.length}`));

    const grid = createElement("div", "amc-grid");
    const categoryPanel = createElement("div", "amc-panel");
    categoryPanel.append(createElement("h3", undefined, "確認するカテゴリ"));
    const categoryList = createElement("div", "amc-categories");
    categoryPanel.append(categoryList);

    const transformPanel = createElement("div", "amc-panel");
    const transform = createElement("fieldset", "amc-transform");
    transform.append(createElement("legend", undefined, "変換モード"));
    const previewTitle = createElement("h3", undefined, "送信される内容");
    const preview = createElement("pre", "amc-preview");
    const status = createElement("p", "amc-note");
    transformPanel.append(transform, status, previewTitle, preview);

    const footer = createElement("footer", "amc-footer");
    const submitButton = createElement("button", "amc-button amc-primary");
    const editButton = createElement("button", "amc-button", "編集");
    const cancelButton = createElement("button", "amc-button", "キャンセル");
    footer.append(submitButton, editButton, cancelButton);

    grid.append(categoryPanel, transformPanel);
    body.append(summary, grid);
    dialog.append(header, body, footer);
    overlay.append(dialog);
    shadow.append(overlay);

    const renderPreview = () => {
      preview.textContent = createConfirmedText(options.inputText, options.detection.findings, selectedFindingIds, mode);
      const currentSelected = selectedFindings(options.detection.findings, selectedFindingIds);
      submitButton.textContent = policy.canSendRaw && currentSelected.length === 0 ? "そのまま送信" : "安全化して送信";
      submitButton.toggleAttribute("disabled", !canSubmitSelection(groups, selectedFindingIds));
    };

    const renderCategories = () => {
      categoryList.replaceChildren();

      for (const group of groups) {
        const card = createElement("section", "amc-category");
        const main = createElement("label", "amc-category-main");
        const checkbox = createElement("input") as HTMLInputElement;
        checkbox.type = "checkbox";
        checkbox.checked = group.findingIds.every((id) => selectedFindingIds.has(id));
        checkbox.disabled = group.locked;
        checkbox.addEventListener("change", () => {
          updateCategorySelection(selectedFindingIds, group.findingIds, checkbox.checked);
          renderPreview();
        });

        const content = createElement("div");
        const heading = createElement("div", "amc-category-heading");
        heading.append(createElement("span", "amc-category-title", group.label));
        heading.append(createElement("span", `amc-badge amc-${group.riskLevel}`, `危険度: ${riskLabels[group.riskLevel]}`));
        heading.append(createElement("span", "amc-badge", `${group.count}件`));
        if (group.locked) {
          heading.append(createElement("span", "amc-badge amc-high", "安全化必須"));
        }

        content.append(heading);
        content.append(
          createElement(
            "p",
            "amc-note",
            group.locked
              ? "このカテゴリは安全化対象から外せません。"
              : "必要に応じて安全化対象から外せます。"
          )
        );

        const details = createElement("details", "amc-details");
        details.append(createElement("summary", undefined, "詳細を開く"));
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
        categoryList.append(card);
      }
    };

    const renderModeOptions = () => {
      for (const option of transformModeOptions) {
        const label = createElement("label", "amc-radio");
        const radio = createElement("input") as HTMLInputElement;
        radio.type = "radio";
        radio.name = "amc-transform-mode";
        radio.value = option.value;
        radio.checked = mode === option.value;
        radio.addEventListener("change", () => {
          mode = option.value;
          status.textContent = "";
          renderPreview();
        });

        const copy = createElement("span");
        copy.append(createElement("strong", undefined, option.title));
        copy.append(createElement("p", "amc-note", option.description));
        label.append(radio, copy);
        transform.append(label);
      }
    };

    submitButton.addEventListener("click", () => {
      if (!canSubmitSelection(groups, selectedFindingIds)) {
        return;
      }

      cleanup();
      resolve({
        type: "submit",
        text: createConfirmedText(options.inputText, options.detection.findings, selectedFindingIds, mode)
      });
    });

    editButton.addEventListener("click", () => {
      cleanup();
      resolve({ type: "edit" });
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

    renderCategories();
    renderModeOptions();
    renderPreview();
  });
}
