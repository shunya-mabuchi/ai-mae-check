import type { DetectionResult, DlpPolicyDecision, RiskDecisionLevel } from "@ai-mae-check/core";
import { filePreflightModalCss } from "./fileModalStyles";
import { createElement } from "../lib/domElement";

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
    style.textContent = filePreflightModalCss;

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
