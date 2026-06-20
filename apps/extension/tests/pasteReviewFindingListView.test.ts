import { describe, expect, it } from "vitest";
import { createPasteReviewFindingListView } from "../src/lib/pasteReviewFindingListView";
import { buildFinding } from "./testBuilders";

describe("createPasteReviewFindingListView", () => {
  it("検出項目がない場合は空状態メッセージを返す", () => {
    const view = createPasteReviewFindingListView([], new Set());

    expect(view).toEqual({
      emptyMessage: "検出項目はありません。",
      items: []
    });
  });

  it("検出項目がある場合は表示情報と選択状態を返す", () => {
    const view = createPasteReviewFindingListView(
      [
        buildFinding(),
        buildFinding({
          id: "finding-2",
          source: "llm",
          label: "顧客名候補",
          riskLevel: "medium",
          text: "A社",
          message: "顧客名の可能性があります。"
        })
      ],
      new Set(["finding-1"])
    );

    expect(view.emptyMessage).toBeUndefined();
    expect(view.items).toHaveLength(2);
    expect(view.items[0]).toMatchObject({
      id: "finding-1",
      selected: true,
      label: "メールアドレス",
      text: "taro@example.com",
      message: "外部へ貼り付ける前に確認したい情報です。",
      riskBadgeText: "危険度: 高",
      sourceLabel: "ルール",
      selectionLabel: "マスク対象"
    });
    expect(view.items[1]).toMatchObject({
      id: "finding-2",
      selected: false,
      label: "顧客名候補",
      text: "A社",
      riskBadgeText: "危険度: 中",
      sourceLabel: "AI候補",
      selectionLabel: "マスク対象外"
    });
  });
});
