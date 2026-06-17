import { describe, expect, it } from "vitest";
import { createPasteReviewFindingView } from "../src/lib/pasteReviewFindingView";
import type { Finding } from "@ai-mae-check/core";

function finding(overrides: Partial<Finding> = {}): Finding {
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

describe("createPasteReviewFindingView", () => {
  it("ルール由来の選択済み検出項目の表示情報を返す", () => {
    const view = createPasteReviewFindingView(finding(), true);

    expect(view).toMatchObject({
      riskBadgeClassName: "review-badge review-badge-high",
      riskBadgeText: "危険度: 高",
      sourceLabel: "ルール",
      selectionLabel: "マスク対象"
    });
  });

  it("LLM由来の未選択検出項目の表示情報を返す", () => {
    const view = createPasteReviewFindingView(finding({ source: "llm", riskLevel: "medium" }), false);

    expect(view).toMatchObject({
      riskBadgeClassName: "review-badge review-badge-medium",
      riskBadgeText: "危険度: 中",
      sourceLabel: "AI候補",
      selectionLabel: "マスク対象外"
    });
  });
});
