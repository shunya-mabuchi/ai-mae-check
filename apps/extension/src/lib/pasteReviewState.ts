import type { RiskLevel } from "@ai-mae-check/core";

export interface PasteReviewActionState {
  rawButtonText: string;
  rawButtonDisabled: boolean;
  rawButtonTitle: string;
  footerNote: string;
}

export const RAW_PASTE_BLOCKED_MESSAGE = "高リスクまたはSecret Guard対象のため、そのまま貼り付けはできません。";

export const pasteReviewRiskLabel: Record<RiskLevel, string> = {
  critical: "重大",
  high: "高",
  medium: "中",
  low: "低"
};

export function createPasteReviewActionState(rawPasteAllowed: boolean): PasteReviewActionState {
  return {
    rawButtonText: rawPasteAllowed ? "そのまま貼り付け" : "そのまま貼り付け（不可）",
    rawButtonDisabled: !rawPasteAllowed,
    rawButtonTitle: rawPasteAllowed ? "" : RAW_PASTE_BLOCKED_MESSAGE,
    footerNote: rawPasteAllowed ? "" : RAW_PASTE_BLOCKED_MESSAGE
  };
}
