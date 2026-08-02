import { evaluateDlpPolicy, type Finding, type TransformMode } from "@ai-mae-check/core";
import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import { isLlmBridgeModelReady } from "../lib/llmBridgeClient";
import { runReviewLlm } from "../lib/reviewLlmRunner";
import { resolveReviewFindings } from "../lib/reviewSelection";
import { resolveLlmModelId } from "../lib/settings";
import { renderConfirmModalCandidateList } from "./confirmModalCandidateList";
import { renderConfirmModalCategoryList } from "./confirmModalCategoryList";
import { applyConfirmModalFooterState } from "./confirmModalFooter";
import {
  canSubmitSelection,
  createCategoryGroups,
  createConfirmedTextFromFindings,
  createConfirmModalFooterState
} from "./confirmModalState";
import type {
  ConfirmModalDecision,
  SendConfirmDialogElements,
  SendConfirmModalOptions
} from "./confirmModalTypes";

interface InitializeSendConfirmModalControllerOptions extends SendConfirmModalOptions {
  elements: SendConfirmDialogElements;
  close: (decision: ConfirmModalDecision) => void;
  isClosed: () => boolean;
}

export interface SendConfirmModalController {
  dispose: () => void;
}

export function initializeSendConfirmModalController(
  options: InitializeSendConfirmModalControllerOptions
): SendConfirmModalController {
  const policy = evaluateDlpPolicy(options.detection.findings);
  const groups = createCategoryGroups(options.detection.findings, policy);
  const selectedFindingIds = new Set(options.detection.findings.map((finding) => finding.id));
  const selectedCandidateIds = new Set<string>();
  let llmCandidates: ContextRiskCandidate[] = [];
  let llmEmptyCandidateMessageVisible = false;
  let llmHasStarted = false;
  let llmRunning = false;
  let disposed = false;
  const mode: TransformMode = options.defaultMode ?? "generalize";
  const llmModelId = resolveLlmModelId(options.llm);

  const isActive = () => !disposed && !options.isClosed();

  const currentFindings = (): Finding[] =>
    resolveReviewFindings({
      input: options.inputText,
      ruleFindings: options.detection.findings,
      selectedRuleFindingIds: selectedFindingIds,
      candidates: llmCandidates,
      selectedCandidateIds
    });

  const renderPreview = () => {
    if (!isActive()) {
      return;
    }

    const findings = currentFindings();
    options.elements.preview.textContent = createConfirmedTextFromFindings(
      options.inputText,
      findings,
      mode
    );
    applyConfirmModalFooterState(
      { submitButton: options.elements.submitButton },
      createConfirmModalFooterState({
        policy,
        groups,
        findings,
        selectedFindingIds: new Set(findings.map((finding) => finding.id))
      })
    );
  };

  const renderCandidates = () => {
    if (!isActive()) {
      return;
    }

    renderConfirmModalCandidateList(
      options.elements.candidateList,
      llmCandidates,
      selectedCandidateIds,
      () => {
        renderPreview();
        renderCandidates();
      },
      { showEmptyMessage: llmEmptyCandidateMessageVisible }
    );
  };

  const renderAfterLlm = () => {
    renderPreview();
    renderCandidates();
  };

  renderConfirmModalCategoryList({
    container: options.elements.categoryList,
    groups,
    selectedFindingIds,
    onChange: renderPreview
  });

  const onSubmit = () => {
    if (!isActive() || !canSubmitSelection(groups, selectedFindingIds)) {
      return;
    }

    options.close({
      type: "submit",
      text: createConfirmedTextFromFindings(options.inputText, currentFindings(), mode)
    });
  };

  const runLlm = async (source: "manual" | "auto") => {
    if (!isActive() || llmRunning || (source === "auto" && llmHasStarted)) {
      return;
    }

    llmHasStarted = true;
    llmRunning = true;
    try {
      await runReviewLlm({
        enabled: options.llm?.enabled ?? false,
        inputText: options.inputText,
        modelId: llmModelId,
        existingFindings: options.detection.findings,
        llmStatus: options.elements.llmStatus,
        llmButton: options.elements.llmButton,
        selectedCandidateIds,
        setCandidates: (candidates) => {
          llmCandidates = candidates;
        },
        setEmptyCandidateMessageVisible: (visible) => {
          llmEmptyCandidateMessageVisible = visible;
        },
        render: renderAfterLlm,
        isActive
      });
    } finally {
      llmRunning = false;
    }
  };

  const onLlm = () => {
    void runLlm("manual");
  };
  const onCancel = () => {
    if (isActive()) {
      options.close({ type: "cancel" });
    }
  };

  options.elements.submitButton.addEventListener("click", onSubmit);
  options.elements.llmButton.addEventListener("click", onLlm);
  options.elements.cancelButton.addEventListener("click", onCancel);

  renderCandidates();
  renderPreview();

  if (options.llm?.enabled && options.llm.mode === "auto") {
    void isLlmBridgeModelReady(llmModelId)
      .then((modelReady) => {
        if (isActive() && modelReady) {
          void runLlm("auto");
        }
      })
      .catch(() => {
        // 準備状態の取得に失敗しても、手動ボタンとルールベース検出はそのまま使える。
      });
  }

  return {
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      options.elements.submitButton.removeEventListener("click", onSubmit);
      options.elements.llmButton.removeEventListener("click", onLlm);
      options.elements.cancelButton.removeEventListener("click", onCancel);
    }
  };
}
