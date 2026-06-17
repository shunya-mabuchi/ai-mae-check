import type { Finding } from "@ai-mae-check/core";
import { riskLabel, riskTone } from "./demoConstants";

export interface DemoFindingItemViewModel {
  id: string;
  selected: boolean;
  label: string;
  text: string;
  message: string;
  riskBadgeText: string;
  riskBadgeClassName: string;
  sourceLabel: string;
  selectionLabel: string;
  selectionClassName: string;
}

export function createDemoFindingItemViewModel(finding: Finding, selected: boolean): DemoFindingItemViewModel {
  return {
    id: finding.id,
    selected,
    label: finding.label,
    text: finding.text,
    message: finding.message,
    riskBadgeText: `危険度: ${riskLabel[finding.riskLevel]}`,
    riskBadgeClassName: `rounded-card border px-2 py-1 text-xs font-bold ${riskTone[finding.riskLevel]}`,
    sourceLabel: finding.source === "llm" ? "AI候補" : "ルール",
    selectionLabel: selected ? "マスク対象" : "対象外",
    selectionClassName: `text-xs font-black ${selected ? "text-leaf" : "text-muted"}`
  };
}
