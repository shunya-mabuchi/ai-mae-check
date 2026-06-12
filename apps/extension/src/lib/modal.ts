import {
  maskSensitiveText,
  mergeFindings,
  type DetectionResult,
  type Finding,
  type RiskLevel
} from "@harumae/core";
import {
  classifyLlmError,
  convertContextCandidatesToFindings,
  createLlmContextAnalyzer,
  isWebGpuAvailable,
  type ContextRiskCandidate,
  type LlmErrorDetail,
  type LlmProgress
} from "@harumae/llm";
import type { HarumaeSettings } from "./settings";

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
  settings: HarumaeSettings;
}

const riskLabel: Record<RiskLevel, string> = {
  high: "高",
  medium: "中",
  low: "低"
};

const css = `
  :host {
    all: initial;
    color: #202124;
    font-family: system-ui, "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif;
    font-size: 14px;
  }
  .hm-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: grid;
    place-items: center;
    background: rgba(32, 33, 36, 0.42);
    padding: 20px;
  }
  .hm-dialog {
    width: min(920px, 100%);
    max-height: min(780px, calc(100vh - 40px));
    overflow: auto;
    border: 1px solid #dfded8;
    border-radius: 8px;
    background: #fbfaf7;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.24);
  }
  .hm-header, .hm-footer {
    padding: 18px 20px;
  }
  .hm-header {
    border-bottom: 1px solid #dfded8;
    background: white;
  }
  .hm-title {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0;
  }
  .hm-description {
    margin: 0;
    color: #5f6368;
    line-height: 1.7;
  }
  .hm-body {
    display: grid;
    gap: 16px;
    padding: 20px;
  }
  .hm-summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .hm-count {
    border: 1px solid #dfded8;
    border-radius: 6px;
    background: white;
    padding: 12px;
  }
  .hm-count strong {
    display: block;
    margin-top: 4px;
    font-size: 24px;
  }
  .hm-high { color: #b91c1c; }
  .hm-medium { color: #92400e; }
  .hm-low { color: #57534e; }
  .hm-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 16px;
  }
  .hm-panel {
    min-width: 0;
  }
  .hm-panel h3 {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 700;
  }
  .hm-list {
    display: grid;
    gap: 10px;
    max-height: 270px;
    overflow: auto;
  }
  .hm-item {
    border: 1px solid #dfded8;
    border-radius: 6px;
    background: white;
    padding: 10px;
  }
  .hm-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 8px;
  }
  .hm-badge {
    border-radius: 6px;
    border: 1px solid #dfded8;
    padding: 3px 7px;
    font-size: 12px;
    font-weight: 700;
  }
  .hm-badge-high { border-color: #fecaca; background: #fef2f2; color: #b91c1c; }
  .hm-badge-medium { border-color: #fde68a; background: #fffbeb; color: #92400e; }
  .hm-badge-low { border-color: #e7e5e4; background: #f5f5f4; color: #57534e; }
  .hm-text {
    display: block;
    max-width: 100%;
    overflow-wrap: anywhere;
    border-radius: 4px;
    background: #f5f5f4;
    padding: 6px 8px;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    white-space: pre-wrap;
  }
  .hm-message {
    margin: 8px 0 0;
    color: #5f6368;
    line-height: 1.6;
    font-size: 12px;
  }
  .hm-preview {
    min-height: 180px;
    max-height: 270px;
    overflow: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    border: 1px solid #dfded8;
    border-radius: 6px;
    background: white;
    padding: 12px;
    line-height: 1.7;
  }
  .hm-llm {
    border: 1px solid #dfded8;
    border-radius: 6px;
    background: white;
    padding: 12px;
  }
  .hm-llm-status {
    margin: 0 0 10px;
    color: #5f6368;
    line-height: 1.6;
  }
  .hm-candidate {
    display: flex;
    gap: 10px;
    border-top: 1px solid #eee;
    padding-top: 10px;
    margin-top: 10px;
  }
  .hm-select-row {
    display: flex;
    gap: 10px;
  }
  .hm-select-row input,
  .hm-candidate input {
    margin-top: 3px;
    accent-color: #2f7d57;
  }
  .hm-footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
    border-top: 1px solid #dfded8;
    background: white;
  }
  .hm-button {
    min-height: 40px;
    border: 1px solid #dfded8;
    border-radius: 6px;
    background: white;
    color: #202124;
    padding: 8px 12px;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  .hm-button:hover {
    background: #f5f5f4;
  }
  .hm-primary {
    border-color: #2f7d57;
    background: #2f7d57;
    color: white;
  }
  .hm-primary:hover {
    background: #276848;
  }
  .hm-dark {
    border-color: #202124;
    background: #202124;
    color: white;
  }
  .hm-dark:hover {
    background: #343638;
  }
  @media (max-width: 720px) {
    .hm-grid {
      grid-template-columns: 1fr;
    }
    .hm-summary {
      grid-template-columns: 1fr;
    }
    .hm-footer {
      justify-content: stretch;
    }
    .hm-button {
      width: 100%;
    }
  }
`;

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
    meta.append(createElement("span", `hm-badge hm-badge-${finding.riskLevel}`, `危険度: ${riskLabel[finding.riskLevel]}`));
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
    meta.append(createElement("span", `hm-badge hm-badge-${candidate.riskLevel}`, `危険度: ${riskLabel[candidate.riskLevel]}`));
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
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = css;
    shadow.append(style);

    const overlay = createElement("div", "hm-overlay");
    const dialog = createElement("section", "hm-dialog");
    const header = createElement("header", "hm-header");
    header.append(createElement("h2", "hm-title", "このまま貼り付けますか？"));
    header.append(
      createElement(
        "p",
        "hm-description",
        "貼り付けようとしている文章に、注意が必要な情報が含まれている可能性があります。"
      )
    );

    const body = createElement("div", "hm-body");
    const summary = createElement("div", "hm-summary");
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
    llmPanel.append(createElement("h3", undefined, "WebLLMによる文脈チェック結果"));
    const llmStatus = createElement("p", "hm-llm-status", "AI文脈チェックは手動で実行できます。");
    const candidateList = createElement("div");
    llmPanel.append(llmStatus, candidateList);

    body.append(summary, grid, llmPanel);

    const footer = createElement("footer", "hm-footer");
    const maskButton = createElement("button", "hm-button hm-primary", "マスクして貼る");
    const llmButton = createElement("button", "hm-button hm-dark", "AI文脈チェックも実行");
    const rawButton = createElement("button", "hm-button", "そのまま貼る");
    const cancelButton = createElement("button", "hm-button", "キャンセル");
    footer.append(maskButton, llmButton, rawButton, cancelButton);

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

    const render = () => {
      const findings = currentFindings();
      renderFindingList(list, options.detection.findings, selectedRuleFindingIds, render);
      preview.textContent = maskSensitiveText(options.inputText, findings).maskedText;
      renderCandidates(candidateList, llmCandidates, selectedCandidateIds, render);
    };

    const cleanup = () => {
      host.remove();
    };

    const runLlm = async () => {
      if (!options.settings.llm.enabled) {
        llmStatus.textContent = "設定でAI文脈チェックが無効になっています。";
        return;
      }

      if (!isWebGpuAvailable()) {
        llmStatus.textContent =
          "このブラウザまたは端末ではAI文脈チェックを利用できません。ルールベースの検出は引き続き利用できます。";
        return;
      }

      llmButton.setAttribute("disabled", "true");
      llmStatus.textContent = "ローカルAIモデルを準備しています。初回のみ時間がかかる場合があります。";
      const analyzer = createLlmContextAnalyzer({
        modelId: options.settings.llm.modelId,
        workerUrl: chrome.runtime.getURL("llm-worker.js")
      });

      try {
        const result = await analyzer.analyze(options.inputText, {
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
        analyzer.dispose();
        llmButton.removeAttribute("disabled");
      }
    };

    maskButton.addEventListener("click", () => {
      const maskedText = maskSensitiveText(options.inputText, currentFindings()).maskedText;
      cleanup();
      resolve({ type: "insert", text: maskedText });
    });

    llmButton.addEventListener("click", () => {
      void runLlm();
    });

    rawButton.addEventListener("click", () => {
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

    if (options.settings.llm.enabled && options.settings.llm.mode === "auto") {
      void runLlm();
    }
  });
}
