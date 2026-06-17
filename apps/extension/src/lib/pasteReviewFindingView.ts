import type { Finding } from "@ai-mae-check/core";
import { pasteReviewRiskLabel } from "./pasteReviewState";

export interface PasteReviewFindingView {
  riskBadgeClassName: string;
  riskBadgeText: string;
  sourceLabel: string;
  selectionLabel: string;
}

export function createPasteReviewFindingView(finding: Finding, selected: boolean): PasteReviewFindingView {
  return {
    riskBadgeClassName: `review-badge review-badge-${finding.riskLevel}`,
    riskBadgeText: `危険度: ${pasteReviewRiskLabel[finding.riskLevel]}`,
    sourceLabel: finding.source === "llm" ? "AI候補" : "ルール",
    selectionLabel: selected ? "マスク対象" : "マスク対象外"
  };
}
