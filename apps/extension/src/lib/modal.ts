import {
  evaluateDlpPolicy,
  maskSensitiveText,
  mergeFindings,
  transformText,
  type DetectionResult,
  type Finding
} from "@ai-mae-check/core";
import {
  classifyLlmError,
  convertContextCandidatesToFindings,
  type ContextRiskCandidate,
  type LlmErrorDetail,
  type LlmProgress
} from "@ai-mae-check/llm";
import { pasteReviewModalCss } from "./modalStyles";
import {
  createPasteReviewActionState,
  pasteReviewRiskLabel,
  RAW_PASTE_BLOCKED_MESSAGE
} from "./pasteReviewState";
import type { AiMaeCheckSettings } from "./settings";
import { analyzeContextWithBridge } from "./llmBridgeClient";

type ModalDecision =
  | {
      type: "insert";
      text: string;
    }
  | {
      type: "cancel";
    };

interface PasteReviewModalOptions {
  inputText: string;
  detection: DetectionResult;
  settings: AiMaeCheckSettings;
  mode?: "default" | "paste_guard" | "context_check";
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function renderFindingList(
  container: HTMLElement,
  findings: Finding[],
  selectedFindingIds: Set<string>,
  onChange: () => void
): void {
  container.replaceChildren();
  if (findings.length === 0) {
    container.append(createElement("p", "hm-message", "検出項目はありません。"));
    return;
  }

  for (const finding of findings) {
    const item = createElement("label", "hm-item");
    const wrapper = createElement("div", "hm-select-row");
    const checkbox = createElement("input") as HTMLInputElement;
    checkbox.type = "checkbox";
    checkbox.checked = selectedFindingIds.has(finding.id);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedFindingIds.add(finding.id);
      } else {
        selectedFindingIds.delete(finding.id);
      }
      onChange();
    });

    const body = createElement("div");
    const meta = createElement("div", "hm-meta");
    meta.append(createElement("span", `hm-badge hm-badge-${finding.riskLevel}`, `危険度: ${pasteReviewRiskLabel[finding.riskLevel]}`));
    meta.append(createElement("strong", undefined, finding.label));
    meta.append(createElement("span", "hm-message", finding.source === "llm" ? "AI候補" : "ルール"));
    meta.append(createElement("span", "hm-message", selectedFindingIds.has(finding.id) ? "マスク対象" : "マスク対象外"));
    body.append(meta);
    body.append(createElement("code", "hm-text", finding.text));
    body.append(createElement("p", "hm-message", finding.message));
    wrapper.append(checkbox, body);
    item.append(wrapper);
    container.append(item);
  }
}

function renderCandidates(
  container: HTMLElement,
  candidates: ContextRiskCandidate[],
  selectedCandidateIds: Set<string>,
  onChange: () => void
): void {
  container.replaceChildren();
  for (const candidate of candidates) {
    const label = createElement("label", "hm-candidate");
    const checkbox = createElement("input") as HTMLInputElement;
    checkbox.type = "checkbox";
    checkbox.checked = selectedCandidateIds.has(candidate.id);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedCandidateIds.add(candidate.id);
      } else {
        selectedCandidateIds.delete(candidate.id);
      }
      onChange();
    });

    const body = createElement("div");
    const meta = createElement("div", "hm-meta");
    meta.append(createElement("strong", undefined, candidate.label));
    meta.append(createElement("span", `hm-badge hm-badge-${candidate.riskLevel}`, `危険度: ${pasteReviewRiskLabel[candidate.riskLevel]}`));
    meta.append(createElement("span", "hm-message", `confidence: ${candidate.confidence.toFixed(2)}`));
    body.append(meta);
    body.append(createElement("code", "hm-text", candidate.surface));
    body.append(createElement("p", "hm-message", candidate.reason));

    label.append(checkbox, body);
    container.append(label);
  }
}

function formatLlmStatusMessage(message: string, detail?: LlmErrorDetail): string {
  if (!detail) {
    return message;
  }

  const technical = detail.technicalDetail ? `\n詳細: ${detail.technicalDetail}` : "";
  return `${message}\n診断メモ: ${detail.hint}${technical}`;
}

export async function showPasteReviewModal(options: PasteReviewModalOptions): Promise<ModalDecision> {
  return new Promise((resolve) => {
    const isPasteGuard = options.mode === "paste_guard";
    const isContextCheck = options.mode === "context_check";
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = pasteReviewModalCss;
    shadow.append(style);

    const overlay = createElement("div", "hm-overlay");
    const dialog = createElement("section", "hm-dialog");
    const header = createElement("header", "hm-header");
    header.append(
      createElement(
        "h2",
        "hm-title",
        isPasteGuard ? "安全化してから貼り付けますか？" : isContextCheck ? "AI文脈チェックを実行しますか？" : "このまま貼り付けますか？"
      )
    );
    header.append(
      createElement(
        "p",
        "hm-description",
        isPasteGuard
          ? "貼り付けようとしている文章に、秘密情報や高リスク情報の可能性があります。そのまま貼り付けず、安全化してから入力できます。"
          : isContextCheck
            ? "ルールベースの検出はありませんが、文脈によっては注意が必要な内容の可能性があります。必要に応じてブラウザ内でAI文脈チェックを実行できます。"
          : "貼り付けようとしている文章に、注意が必要な情報が含まれている可能性があります。"
      )
    );

    const policy = evaluateDlpPolicy(options.detection.findings);
    const rawPasteAllowed = !policy.requiresSanitization;
    const body = createElement("div", "hm-body");
    const summary = createElement("div", "hm-summary");
    summary.append(createElement("div", "hm-count hm-critical", `重大リスク件数\n${options.detection.summary.critical}`));
    summary.append(createElement("div", "hm-count hm-high", `高リスク件数\n${options.detection.summary.high}`));
    summary.append(createElement("div", "hm-count hm-medium", `中リスク件数\n${options.detection.summary.medium}`));
    summary.append(createElement("div", "hm-count hm-low", `低リスク件数\n${options.detection.summary.low}`));

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
    const llmStatus = createElement("p", "hm-llm-status", "AI文脈チェックは手動で実行できます。");
    const candidateList = createElement("div");
    llmPanel.append(llmStatus, candidateList);

    body.append(summary, grid);
    body.append(llmPanel);

    const footer = createElement("footer", "hm-footer");
    const footerNote = createElement("p", "hm-footer-note");
    const maskButton = createElement("button", "hm-button hm-primary", isPasteGuard ? "安全化して貼り付け" : "マスクして入力");
    const llmButton = createElement("button", "hm-button hm-dark", "AI文脈チェックも実行");
    const rawButton = createElement("button", "hm-button", "そのまま貼り付け");
    const cancelButton = createElement("button", "hm-button", "キャンセル");
    if (isPasteGuard) {
      footer.append(footerNote, maskButton, llmButton, rawButton, cancelButton);
    } else if (isContextCheck) {
      maskButton.textContent = "候補をマスクして入力";
      footer.append(footerNote, maskButton, llmButton, rawButton, cancelButton);
    } else {
      footer.append(footerNote, maskButton, llmButton, rawButton, cancelButton);
    }

    dialog.append(header, body, footer);
    overlay.append(dialog);
    shadow.append(overlay);
    document.documentElement.append(host);

    let llmCandidates: ContextRiskCandidate[] = [];
    const selectedRuleFindingIds = new Set(options.detection.findings.map((finding) => finding.id));
    const selectedCandidateIds = new Set<string>();

    const currentFindings = () => {
      const selectedRuleFindings = options.detection.findings.filter((finding) => selectedRuleFindingIds.has(finding.id));
      const selectedCandidates = llmCandidates.filter((candidate) => selectedCandidateIds.has(candidate.id));
      const llmFindings = convertContextCandidatesToFindings(options.inputText, selectedCandidates);
      return mergeFindings(selectedRuleFindings, llmFindings);
    };

    const renderAfterSelectionChange = () => {
      render();
    };

    const render = () => {
      const findings = currentFindings();
      renderFindingList(list, options.detection.findings, selectedRuleFindingIds, renderAfterSelectionChange);
      preview.textContent = maskSensitiveText(options.inputText, findings).maskedText;
      renderCandidates(candidateList, llmCandidates, selectedCandidateIds, renderAfterSelectionChange);
      if (isContextCheck) {
        maskButton.toggleAttribute("disabled", findings.length === 0);
      }
      const actionState = createPasteReviewActionState(rawPasteAllowed);
      rawButton.textContent = actionState.rawButtonText;
      rawButton.toggleAttribute("disabled", actionState.rawButtonDisabled);
      rawButton.title = actionState.rawButtonTitle;
      footerNote.textContent = actionState.footerNote;
      footerNote.hidden = actionState.footerNote.length === 0;
    };

    const cleanup = () => {
      host.remove();
    };

    const runLlm = async () => {
      if (!options.settings.llm.enabled) {
        llmStatus.textContent = "設定でAI文脈チェックが無効になっています。";
        return;
      }

      llmButton.setAttribute("disabled", "true");
      llmStatus.textContent = "ローカルAIモデルを準備しています。初回のみ時間がかかる場合があります。";

      try {
        const result = await analyzeContextWithBridge(options.inputText, {
          modelId: options.settings.llm.modelId,
          existingFindings: options.detection.findings,
          onProgress: (progress: LlmProgress) => {
            llmStatus.textContent = progress.message;
          }
        });

        if (result.error) {
          llmStatus.textContent = formatLlmStatusMessage(result.error, result.errorDetail);
          return;
        }

        llmCandidates = result.candidates;
        selectedCandidateIds.clear();
        for (const candidate of result.candidates) {
          if (candidate.confidence >= 0.75) {
            selectedCandidateIds.add(candidate.id);
          }
        }

        llmStatus.textContent =
          result.candidates.length > 0
            ? "AI文脈チェックで注意候補が見つかりました。"
            : "AI文脈チェックでは追加の注意候補は見つかりませんでした。ただし、安全を保証するものではありません。";
        render();
      } catch (error: unknown) {
        const detail = classifyLlmError(error);
        llmStatus.textContent = formatLlmStatusMessage(detail.message, detail);
      } finally {
        llmButton.removeAttribute("disabled");
      }
    };

    maskButton.addEventListener("click", () => {
      const findings = currentFindings();
      const maskedText = isPasteGuard
        ? transformText(options.inputText, findings, "generalize").transformedText
        : maskSensitiveText(options.inputText, findings).maskedText;
      cleanup();
      resolve({ type: "insert", text: maskedText });
    });

    llmButton.addEventListener("click", () => {
      void runLlm();
    });

    rawButton.addEventListener("click", () => {
      if (!rawPasteAllowed) {
        llmStatus.textContent = RAW_PASTE_BLOCKED_MESSAGE;
        return;
      }
      cleanup();
      resolve({ type: "insert", text: options.inputText });
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

    render();

    if (!isPasteGuard && !isContextCheck && options.settings.llm.enabled && options.settings.llm.mode === "auto") {
      void runLlm();
    }
  });
}
