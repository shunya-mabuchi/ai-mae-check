import type { Finding } from "@ai-mae-check/core";
import type { ContextRiskCandidate, LlmErrorDetail } from "@ai-mae-check/llm";

export function buildFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: "finding-1",
    ruleId: "email",
    source: "rule",
    label: "メールアドレス",
    riskLevel: "high",
    start: 0,
    end: 16,
    text: "taro@example.com",
    placeholder: "[EMAIL_1]",
    message: "外部へ貼り付ける前に確認したい情報です。",
    confidence: 0.99,
    ...overrides
  };
}

export function buildContextRiskCandidate(overrides: Partial<ContextRiskCandidate> = {}): ContextRiskCandidate {
  return {
    id: "candidate-1",
    category: "person_name",
    surface: "山田花子さん",
    label: "人名候補",
    reason: "採用文脈に含まれる個人名候補です。",
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
