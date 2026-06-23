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
  decisionLabels
} from "./confirmModalState";
import { renderConfirmModalCandidateList } from "./confirmModalCandidateList";
import { renderConfirmModalCategoryList } from "./confirmModalCategoryList";
import { createConfirmModalElements } from "./confirmModalElements";
import { applyConfirmModalFooterState } from "./confirmModalFooter";
import { confirmModalCss } from "./styles";
import { PASTE_REVIEW_LLM_INITIAL_MESSAGE } from "../lib/pasteReviewLlmState";
import { runReviewLlm } from "../lib/reviewLlmRunner";
import { resolveReviewFindings } from "../lib/reviewSelection";
import type { AiMaeCheckSettings } from "../lib/settings";
import { createShadowHost } from "../lib/shadowHost";
import { setupDialogAccessibility } from "../lib/dialogAccessibility";

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
    const elements = createConfirmModalElements({
      title: "送信前に安全化しますか？",
      description: policy.requiresSanitization
        ? "高リスクまたは秘密情報保護の対象が含まれるため、安全化なしでは送信できません。"
        : "注意が必要なカテゴリを確認できます。不要なカテゴリは詳細から外して、そのまま送信することもできます。",
      categoryPanelTitle: "確認するカテゴリ",
      previewTitle: "安全化後の内容",
      llmTitle: "AI文脈チェック",
      llmButtonLabel: "AIチェック",
      llmButtonTitle: "AI文脈チェックを実行",
      cancelButtonLabel: "キャンセル",
      initialLlmMessage: PASTE_REVIEW_LLM_INITIAL_MESSAGE,
      initialStatusMessage: "具体的な値を、メールアドレス・電話番号などの日本語ラベルへ置き換えます。",
      summaryItems: [
        {
          label: "判定",
          value: decisionLabels[policy.risk.level]
        },
        {
          label: "スコア",
          value: `${policy.risk.score}`
        },
        {
          label: "カテゴリ",
          value: `${groups.length}`
        },
        {
          label: "検出",
          value: `${options.detection.findings.length}`
        }
      ]
    });
    shadow.append(elements.overlay);
    let finished = false;

    const finish = (decision: ConfirmModalDecision) => {
      if (finished) {
        return;
      }
      finished = true;
      accessibility.dispose();
      cleanup();
      resolve(decision);
    };

    const accessibility = setupDialogAccessibility({
      overlay: elements.overlay,
      dialog: elements.dialog,
      initialFocus: elements.submitButton,
      onCancel: () => finish({ type: "cancel" })
    });

    const currentFindings = () =>
      resolveReviewFindings({
        input: options.inputText,
        ruleFindings: options.detection.findings,
        selectedRuleFindingIds: selectedFindingIds,
        candidates: llmCandidates,
        selectedCandidateIds
      });

    const renderPreview = () => {
      const findings = currentFindings();
      elements.preview.textContent = createConfirmedTextFromFindings(options.inputText, findings, mode);
      applyConfirmModalFooterState(
        {
          submitButton: elements.submitButton
        },
        createConfirmModalFooterState({
          policy,
          groups,
          findings,
          selectedFindingIds: new Set(findings.map((finding) => finding.id))
        })
      );
    };

    const renderCandidates = () => {
      renderConfirmModalCandidateList(elements.candidateList, llmCandidates, selectedCandidateIds, () => {
        renderPreview();
        renderCandidates();
      });
    };

    const renderAfterLlm = () => {
      renderPreview();
      renderCandidates();
    };

    renderConfirmModalCategoryList({
      container: elements.categoryList,
      groups,
      selectedFindingIds,
      onChange: renderPreview
    });

    elements.submitButton.addEventListener("click", () => {
      if (!canSubmitSelection(groups, selectedFindingIds)) {
        return;
      }

      finish({
        type: "submit",
        text: createConfirmedTextFromFindings(options.inputText, currentFindings(), mode)
      });
    });

    elements.llmButton.addEventListener("click", () => {
      void runReviewLlm({
        enabled: options.llm?.enabled ?? false,
        inputText: options.inputText,
        modelId: options.llm?.modelId ?? "",
        existingFindings: options.detection.findings,
        llmStatus: elements.llmStatus,
        llmButton: elements.llmButton,
        selectedCandidateIds,
        setCandidates: (candidates) => {
          llmCandidates = candidates;
        },
        render: renderAfterLlm
      });
    });

    elements.cancelButton.addEventListener("click", () => {
      finish({ type: "cancel" });
    });

    elements.overlay.addEventListener("click", (event) => {
      if (event.target === elements.overlay) {
        finish({ type: "cancel" });
      }
    });

    renderCandidates();
    renderPreview();
    accessibility.activate();
  });
}
