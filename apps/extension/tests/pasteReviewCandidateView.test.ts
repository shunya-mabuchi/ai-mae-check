import { describe, expect, it } from "vitest";
import { createPasteReviewCandidateView } from "../src/lib/pasteReviewCandidateView";
import { buildContextRiskCandidate } from "./testBuilders";

describe("createPasteReviewCandidateView", () => {
  it("AI候補の危険度バッジとconfidence表示を返す", () => {
    const view = createPasteReviewCandidateView(buildContextRiskCandidate(), true);

    expect(view).toMatchObject({
      riskBadgeClassName: "review-badge review-badge-medium",
      riskBadgeText: "危険度: 中",
      confidenceText: "confidence: 0.88",
      selectionLabel: "マスク対象"
    });
  });

  it("未選択候補の表示情報を返す", () => {
    const view = createPasteReviewCandidateView(
      buildContextRiskCandidate({ riskLevel: "high", confidence: 0.7 }),
      false
    );

    expect(view).toMatchObject({
      riskBadgeClassName: "review-badge review-badge-high",
      riskBadgeText: "危険度: 高",
      confidenceText: "confidence: 0.70",
      selectionLabel: "マスク対象外"
    });
  });
});
