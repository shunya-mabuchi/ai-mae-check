import { describe, expect, it } from "vitest";
import { createPasteReviewEmptySelectableListView } from "../src/lib/pasteReviewSelectableListView";

describe("createPasteReviewEmptySelectableListView", () => {
  it("空状態メッセージと空のitemsを返す", () => {
    const view = createPasteReviewEmptySelectableListView("表示できる項目はありません。");

    expect(view).toEqual({
      emptyMessage: "表示できる項目はありません。",
      items: []
    });
  });
});
