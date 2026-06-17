import { describe, expect, it } from "vitest";
import { createPasteReviewCandidateView } from "../src/lib/pasteReviewCandidateView";
import type { ContextRiskCandidate } from "@ai-mae-check/llm";

function candidate(overrides: Partial<ContextRiskCandidate> = {}): ContextRiskCandidate {
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

describe("createPasteReviewCandidateView", () => {
  it("AI候補の危険度バッジとconfidence表示を返す", () => {
    const view = createPasteReviewCandidateView(candidate(), true);

    expect(view).toMatchObject({
      riskBadgeClassName: "review-badge review-badge-medium",
      riskBadgeText: "危険度: 中",
      confidenceText: "confidence: 0.88",
      selectionLabel: "マスク対象"
    });
  });

  it("未選択候補の表示情報を返す", () => {
    const view = createPasteReviewCandidateView(candidate({ riskLevel: "high", confidence: 0.7 }), false);

    expect(view).toMatchObject({
      riskBadgeClassName: "review-badge review-badge-high",
      riskBadgeText: "危険度: 高",
      confidenceText: "confidence: 0.70",
      selectionLabel: "マスク対象外"
    });
  });
});
