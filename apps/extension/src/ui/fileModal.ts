import type { DetectionResult, DlpPolicyDecision, RiskDecisionLevel } from "@ai-mae-check/core";

export interface FilePreflightModalItem {
  fileName: string;
  size: number;
  detection: DetectionResult;
  policy: DlpPolicyDecision;
  safeFileName: string;
}

export interface FilePreflightModalOptions {
  items: FilePreflightModalItem[];
  unsupportedFileNames: string[];
  canAttachRaw: boolean;
}

export type FilePreflightModalDecision = "safe" | "allow_raw" | "cancel";

const riskLabel: Record<RiskDecisionLevel, string> = {
  safe: "安全寄り",
  low: "低",
  medium: "中",
  high: "高",
  critical: "重大"
};

const css = `
  :host {
    all: initial;
    color: #202124;
    font-family: system-ui, "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif;
    font-size: 14px;
  }
  .amc-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: grid;
    place-items: center;
    background: rgba(32, 33, 36, 0.42);
    padding: 20px;
  }
  .amc-dialog {
    width: min(760px, 100%);
    max-height: min(760px, calc(100vh - 40px));
    overflow: auto;
    border: 1px solid #dfded8;
    border-radius: 8px;
    background: #fbfaf7;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.24);
  }
  .amc-header,
  .amc-footer {
    padding: 18px 20px;
    background: #fff;
  }
  .amc-header {
    border-bottom: 1px solid #dfded8;
  }
  .amc-title {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0;
  }
  .amc-description,
  .amc-note {
    margin: 0;
    color: #5f6368;
    line-height: 1.7;
  }
  .amc-body {
    display: grid;
    gap: 14px;
    padding: 20px;
  }
  .amc-file {
    border: 1px solid #dfded8;
    border-radius: 8px;
    background: #fff;
    padding: 12px;
  }
  .amc-heading {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
  }
  .amc-name {
    font-weight: 700;
    overflow-wrap: anywhere;
  }
  .amc-badge {
    border: 1px solid #dfded8;
    border-radius: 999px;
    padding: 3px 8px;
    font-size: 12px;
    font-weight: 700;
  }
  .amc-high,
  .amc-critical {
    border-color: #fecaca;
    background: #fef2f2;
    color: #b91c1c;
  }
  .amc-medium {
    border-color: #fde68a;
    background: #fffbeb;
    color: #92400e;
  }
  .amc-low,
  .amc-safe {
    border-color: #e7e5e4;
    background: #f5f5f4;
    color: #57534e;
  }
  .amc-footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
    border-top: 1px solid #dfded8;
  }
  .amc-button {
    min-height: 40px;
    border: 1px solid #dfded8;
    border-radius: 8px;
    background: #fff;
    color: #202124;
    padding: 8px 13px;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  .amc-primary {
    border-color: #2f7d57;
    background: #2f7d57;
    color: #fff;
  }
  .amc-button:hover {
    background: #f5f5f4;
  }
  .amc-primary:hover {
    background: #276848;
  }
  @media (max-width: 640px) {
    .amc-button {
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

function formatSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export async function showFilePreflightModal(options: FilePreflightModalOptions): Promise<FilePreflightModalDecision> {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = css;

    const overlay = createElement("div", "amc-overlay");
    const dialog = createElement("section", "amc-dialog");
    const header = createElement("header", "amc-header");
    header.append(createElement("h2", "amc-title", "ファイル添付前に確認しますか？"));
    header.append(
      createElement(
        "p",
        "amc-description",
        "テキスト系ファイルに注意が必要な情報が含まれている可能性があります。ファイル本文は保存しません。"
      )
    );

    const body = createElement("div", "amc-body");
    body.append(
      createElement(
        "p",
        "amc-note",
        "PDF / docx / xlsx / 画像OCRはMVPでは対象外です。対象外ファイルの本文解析は行いません。"
      )
    );

    for (const item of options.items) {
      const card = createElement("section", "amc-file");
      const heading = createElement("div", "amc-heading");
      heading.append(createElement("span", "amc-name", item.fileName));
      heading.append(createElement("span", `amc-badge amc-${item.policy.risk.level}`, `判定: ${riskLabel[item.policy.risk.level]}`));
      heading.append(createElement("span", "amc-badge", `${item.detection.findings.length}件`));
      heading.append(createElement("span", "amc-badge", formatSize(item.size)));
      card.append(heading);
      card.append(createElement("p", "amc-note", `安全版候補: ${item.safeFileName}`));
      if (item.policy.requiresSanitization) {
        card.append(createElement("p", "amc-note", "高リスクまたはSecret Guard対象が含まれるため、そのまま添付はできません。"));
      }
      body.append(card);
    }

    if (options.unsupportedFileNames.length > 0) {
      body.append(createElement("p", "amc-note", `対象外ファイル: ${options.unsupportedFileNames.join(", ")}`));
    }

    const footer = createElement("footer", "amc-footer");
    const safeButton = createElement("button", "amc-button amc-primary", "安全版を作成して添付");
    const rawButton = createElement("button", "amc-button", "このまま添付");
    const cancelButton = createElement("button", "amc-button", "添付をキャンセル");

    footer.append(safeButton);
    if (options.canAttachRaw) {
      footer.append(rawButton);
    }
    footer.append(cancelButton);

    dialog.append(header, body, footer);
    overlay.append(dialog);
    shadow.append(style, overlay);
    document.documentElement.append(host);

    const cleanup = () => host.remove();

    safeButton.addEventListener("click", () => {
      cleanup();
      resolve("safe");
    });
    rawButton.addEventListener("click", () => {
      cleanup();
      resolve("allow_raw");
    });
    cancelButton.addEventListener("click", () => {
      cleanup();
      resolve("cancel");
    });
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        cleanup();
        resolve("cancel");
      }
    });
  });
}
