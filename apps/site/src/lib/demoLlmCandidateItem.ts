import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import { riskLabel, riskTone } from "./demoConstants";

export interface DemoLlmCandidateItemViewModel {
  id: string;
  selected: boolean;
  label: string;
  surface: string;
  reason: string;
  riskBadgeText: string;
  riskBadgeClassName: string;
  confidenceText: string;
}

export function createDemoLlmCandidateItemViewModel(
  candidate: ContextRiskCandidate,
  selected: boolean
): DemoLlmCandidateItemViewModel {
  return {
    id: candidate.id,
    selected,
    label: candidate.label,
    surface: candidate.surface,
    reason: candidate.reason,
    riskBadgeText: `危険度: ${riskLabel[candidate.riskLevel]}`,
    riskBadgeClassName: `rounded-card border px-2 py-1 text-xs font-bold ${riskTone[candidate.riskLevel]}`,
    confidenceText: `信頼度: ${candidate.confidence.toFixed(2)}`
  };
}
