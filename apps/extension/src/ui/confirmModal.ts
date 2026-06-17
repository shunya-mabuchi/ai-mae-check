import {
  evaluateDlpPolicy,
  type DetectionResult,
  type TransformMode
} from "@ai-mae-check/core";
import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import {
  canSubmitSelection,
  createCategoryGroups,
  createConfirmModalFooterState,
  createConfirmedTextFromFindings,
  decisionLabels,
  riskLabels,
  updateCategorySelection
} from "./confirmModalState";
import { confirmModalCss } from "./styles";
import { createElement } from "../lib/domElement";
import { renderPasteReviewCandidateList } from "../lib/pasteReviewListRenderers";
import { runPasteReviewLlm } from "../lib/pasteReviewLlmRunner";
import { PASTE_REVIEW_LLM_INITIAL_MESSAGE } from "../lib/pasteReviewLlmState";
import { resolvePasteReviewFindings } from "../lib/pasteReviewSelection";
import type { AiMaeCheckSettings } from "../lib/settings";
import { createShadowHost } from "../lib/shadowHost";

export type ConfirmModalDecision =
  | {
      type: "submit";
      text: string;
    }
  | {
      type: "cancel";
    };

export interface SendConfirmModalOptions {
  inputText: string;
  detection: DetectionResult;
  defaultMode?: TransformMode;
  llm?: AiMaeCheckSettings["llm"];
}

export async function showSendConfirmModal(options: SendConfirmModalOptions): Promise<ConfirmModalDecision> {
  return new Promise((resolve) => {
    const policy = evaluateDlpPolicy(options.detection.findings);
    const groups = createCategoryGroups(options.detection.findings, policy);
    const selectedFindingIds = new Set(options.detection.findings.map((finding) => finding.id));
    const selectedCandidateIds = new Set<string>();
    let llmCandidates: ContextRiskCandidate[] = [];
    const mode: TransformMode = options.defaultMode ?? "generalize";

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
          ? "高リスクまたは秘密情報保護の対象が含まれるため、安全化なしでは送信できません。"
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
    const previewTitle = createElement("h3", undefined, "安全化後の内容");
    const preview = createElement("pre", "amc-preview");
    const status = createElement("p", "amc-note");
    status.textContent = "具体的な値を、メールアドレス・電話番号などの日本語ラベルへ置き換えます。";
    const llmPanel = createElement("div", "amc-llm-panel");
    const llmTitle = createElement("h3", undefined, "AI文脈チェック");
    const llmStatus = createElement("p", "amc-note", PASTE_REVIEW_LLM_INITIAL_MESSAGE);
    const candidateList = createElement("div", "amc-candidates");
    llmPanel.append(llmTitle, llmStatus, candidateList);
    transformPanel.append(previewTitle, status, preview, llmPanel);

    const footer = createElement("footer", "amc-footer");
    const submitButton = createElement("button", "amc-button amc-primary");
    const llmButton = createElement("button", "amc-button", "AIチェック") as HTMLButtonElement;
    llmButton.title = "AI文脈チェックを実行";
    const cancelButton = createElement("button", "amc-button", "キャンセル");
    footer.append(submitButton, llmButton, cancelButton);

    grid.append(categoryPanel, transformPanel);
    body.append(summary, grid);
    dialog.append(header, body, footer);
    overlay.append(dialog);
    shadow.append(overlay);

    const currentFindings = () => {
      return resolvePasteReviewFindings({
        input: options.inputText,
        ruleFindings: options.detection.findings,
        selectedRuleFindingIds: selectedFindingIds,
        candidates: llmCandidates,
        selectedCandidateIds
      });
    };

    const renderPreview = () => {
      const findings = currentFindings();
      preview.textContent = createConfirmedTextFromFindings(options.inputText, findings, mode);
      const footerState = createConfirmModalFooterState({
        policy,
        groups,
        findings,
        selectedFindingIds: new Set(findings.map((finding) => finding.id))
      });
      submitButton.textContent = footerState.submitButtonText;
      submitButton.toggleAttribute("disabled", footerState.submitButtonDisabled);
    };

    const renderCandidates = () => {
      renderPasteReviewCandidateList(candidateList, llmCandidates, selectedCandidateIds, () => {
        renderPreview();
        renderCandidates();
      });
    };

    const renderAfterLlm = () => {
      renderPreview();
      renderCandidates();
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

    submitButton.addEventListener("click", () => {
      if (!canSubmitSelection(groups, selectedFindingIds)) {
        return;
      }

      cleanup();
      resolve({
        type: "submit",
        text: createConfirmedTextFromFindings(options.inputText, currentFindings(), mode)
      });
    });

    llmButton.addEventListener("click", () => {
      void runPasteReviewLlm({
        enabled: options.llm?.enabled ?? false,
        inputText: options.inputText,
        modelId: options.llm?.modelId ?? "",
        existingFindings: options.detection.findings,
        llmStatus,
        llmButton,
        selectedCandidateIds,
        setCandidates: (candidates) => {
          llmCandidates = candidates;
        },
        render: renderAfterLlm
      });
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
    renderCandidates();
    renderPreview();
  });
}
