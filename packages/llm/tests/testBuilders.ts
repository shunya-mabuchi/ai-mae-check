import type { ContextRiskCandidate, LlmErrorDetail } from "../src";

export function buildContextRiskCandidate(overrides: Partial<ContextRiskCandidate> = {}): ContextRiskCandidate {
  return {
    id: "candidate-1",
    category: "person_name",
    surface: "山田花子さん",
    label: "人名候補",
    reason: "採用文脈に含まれる人名候補です。",
    riskLevel: "medium",
    suggestedPlaceholder: "[PERSON_1]",
    confidence: 0.876,
    ...overrides
  };
}

export function buildLlmErrorDetail(overrides: Partial<LlmErrorDetail> = {}): LlmErrorDetail {
  return {
    kind: "json_parse",
    message: "AI文脈チェックの結果を読み取れませんでした。",
    hint: "必要なら再実行してください。",
    ...overrides
  };
}
