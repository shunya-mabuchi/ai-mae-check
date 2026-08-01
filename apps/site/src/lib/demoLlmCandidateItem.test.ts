import { describe, expect, it } from "vitest";
import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import { createDemoLlmCandidateItemViewModel } from "./demoLlmCandidateItem";

function candidate(overrides: Partial<ContextRiskCandidate> = {}): ContextRiskCandidate {
  return {
    id: "candidate-1",
    category: "person_name",
    surface: "山田花子さん",
    label: "人名候補",
    reason: "敬称つきの個人名らしい表現です。",
    riskLevel: "medium",
    suggestedPlaceholder: "[PERSON_1]",
    confidence: 0.823,
    ...overrides
  };
}

describe("createDemoLlmCandidateItemViewModel", () => {
  it("AI候補の表示情報を返す", () => {
    expect(createDemoLlmCandidateItemViewModel(candidate(), true)).toEqual({
      id: "candidate-1",
      selected: true,
      label: "人名候補",
      surface: "山田花子さん",
      reason: "敬称つきの個人名らしい表現です。",
      riskBadgeText: "危険度: 中",
      riskBadgeClassName: "rounded-card border px-2 py-1 text-xs font-bold border-amber-200 bg-amber-50 text-amber-800",
      confidenceText: "信頼度: 0.82"
    });
  });

  it("高リスクと低リスクも既存トーンで返す", () => {
    expect(createDemoLlmCandidateItemViewModel(candidate({ riskLevel: "high" }), false)).toMatchObject({
      selected: false,
      riskBadgeText: "危険度: 高",
      riskBadgeClassName: "rounded-card border px-2 py-1 text-xs font-bold border-rose-200 bg-rose-50 text-rose-700"
    });

    expect(createDemoLlmCandidateItemViewModel(candidate({ riskLevel: "low" }), false)).toMatchObject({
      selected: false,
      riskBadgeText: "危険度: 低",
      riskBadgeClassName: "rounded-card border px-2 py-1 text-xs font-bold border-slate-200 bg-slate-100 text-slate-700"
    });
  });
});
