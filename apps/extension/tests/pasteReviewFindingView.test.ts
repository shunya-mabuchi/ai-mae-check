import { describe, expect, it } from "vitest";
import { createPasteReviewFindingView } from "../src/lib/pasteReviewFindingView";
import { buildFinding } from "./testBuilders";

describe("createPasteReviewFindingView", () => {
  it("ルール由来の選択済み検出項目の表示情報を返す", () => {
    const view = createPasteReviewFindingView(buildFinding(), true);

    expect(view).toMatchObject({
      riskBadgeClassName: "review-badge review-badge-high",
      riskBadgeText: "危険度: 高",
      sourceLabel: "ルール",
      selectionLabel: "マスク対象"
    });
  });

  it("LLM由来の未選択検出項目の表示情報を返す", () => {
    const view = createPasteReviewFindingView(buildFinding({ source: "llm", riskLevel: "medium" }), false);

    expect(view).toMatchObject({
      riskBadgeClassName: "review-badge review-badge-medium",
      riskBadgeText: "危険度: 中",
      sourceLabel: "AI候補",
      selectionLabel: "マスク対象外"
    });
  });
});
