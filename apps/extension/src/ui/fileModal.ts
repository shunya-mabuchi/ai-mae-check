import type { DetectionResult, DlpPolicyDecision } from "@ai-mae-check/core";
import { filePreflightModalCss } from "./fileModalStyles";
import { createElement } from "../lib/domElement";
import { formatFileSize } from "../lib/fileSize";
import { decisionRiskLabels } from "../lib/riskLabels";
import { createShadowHost } from "../lib/shadowHost";
import { setupDialogAccessibility } from "../lib/dialogAccessibility";

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

export async function showFilePreflightModal(options: FilePreflightModalOptions): Promise<FilePreflightModalDecision> {
  return new Promise((resolve) => {
    const { shadow, cleanup } = createShadowHost(filePreflightModalCss);

    const overlay = createElement("div", "amc-overlay");
    const dialog = createElement("section", "amc-dialog");
    dialog.setAttribute("aria-label", "ファイル添付前確認");
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
        "PDF / docx / xlsx / 画像や画像OCRが必要なファイルは対象外です。本文解析は行わず、安全判定済みとは扱いません。"
      )
    );

    for (const item of options.items) {
      const card = createElement("section", "amc-file");
      const heading = createElement("div", "amc-heading");
      heading.append(createElement("span", "amc-name", item.fileName));
      heading.append(createElement("span", `amc-badge amc-${item.policy.risk.level}`, `判定: ${decisionRiskLabels[item.policy.risk.level]}`));
      heading.append(createElement("span", "amc-badge", `${item.detection.findings.length}件`));
      heading.append(createElement("span", "amc-badge", formatFileSize(item.size)));
      card.append(heading);
      card.append(createElement("p", "amc-note", `安全版候補: ${item.safeFileName}`));
      if (item.policy.requiresSanitization) {
        card.append(createElement("p", "amc-note", "高リスクまたは秘密情報保護の対象が含まれるため、そのまま添付はできません。"));
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
    for (const button of [safeButton, rawButton, cancelButton]) {
      button.type = "button";
    }

    footer.append(safeButton);
    if (options.canAttachRaw) {
      footer.append(rawButton);
    }
    footer.append(cancelButton);

    dialog.append(header, body, footer);
    overlay.append(dialog);
    shadow.append(overlay);
    let finished = false;

    const finish = (decision: FilePreflightModalDecision) => {
      if (finished) {
        return;
      }
      finished = true;
      accessibility.dispose();
      cleanup();
      resolve(decision);
    };

    const accessibility = setupDialogAccessibility({
      overlay,
      dialog,
      initialFocus: safeButton,
      onCancel: () => finish("cancel")
    });

    safeButton.addEventListener("click", () => {
      finish("safe");
    });
    rawButton.addEventListener("click", () => {
      finish("allow_raw");
    });
    cancelButton.addEventListener("click", () => {
      finish("cancel");
    });
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        finish("cancel");
      }
    });
    accessibility.activate();
  });
}
