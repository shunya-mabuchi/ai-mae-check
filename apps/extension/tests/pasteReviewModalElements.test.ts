import { afterEach, describe, expect, it, vi } from "vitest";
import type { PasteReviewSummaryItem } from "../src/lib/pasteReviewSummaryView";
import { createPasteReviewModalElements } from "../src/lib/pasteReviewModalElements";
import { asDomElement, FakeElement, joinedText, stubFakeDocument } from "./helpers/fakeDom";

const summaryItems: PasteReviewSummaryItem[] = [
  {
    level: "critical",
    label: "重大リスク件数",
    count: 1,
    className: "hm-count hm-critical",
    text: "重大リスク件数\n1"
  },
  {
    level: "high",
    label: "高リスク件数",
    count: 2,
    className: "hm-count hm-high",
    text: "高リスク件数\n2"
  }
];

describe("createPasteReviewModalElements", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("貼り付け確認モーダルの骨格と参照を作る", () => {
    stubFakeDocument();

    const elements = createPasteReviewModalElements({
      modalCopy: {
        title: "このまま貼り付けますか？",
        description: "注意が必要な情報が含まれている可能性があります。",
        maskButtonText: "安全化して入力"
      },
      summaryItems,
      initialLlmMessage: "AI文脈チェックは手動で実行できます。"
    });

    expect(elements.overlay.className).toBe("hm-overlay");
    expect(elements.dialog.className).toBe("hm-dialog");
    expect(elements.dialog.getAttribute("aria-label")).toBeTruthy();
    expect(elements.list.className).toBe("hm-list");
    expect(elements.list.getAttribute("aria-label")).toBe("検出項目一覧");
    expect(elements.preview.className).toBe("hm-preview");
    expect(elements.preview.getAttribute("aria-label")).toBe("安全化プレビュー");
    expect(elements.llmStatus.className).toBe("hm-llm-status");
    expect(elements.llmStatus.getAttribute("role")).toBe("status");
    expect(elements.llmStatus.getAttribute("aria-live")).toBe("polite");
    expect(elements.footerNote.className).toBe("hm-footer-note");
    expect(elements.maskButton.type).toBe("button");
    expect(elements.cancelButton.type).toBe("button");
    expect(elements.maskButton.textContent).toBe("安全化して入力");
    expect(elements.llmButton.textContent).toBe("AI文脈チェックも実行");
    expect(elements.rawButton.textContent).toBe("そのまま貼り付け");
    expect(elements.cancelButton.textContent).toBe("キャンセル");

    const text = joinedText(asDomElement<FakeElement>(elements.overlay));
    expect(text).toContain("AIまえチェック");
    expect(text).toContain("貼り付け前チェック");
    expect(text).toContain("重大リスク 1件");
    expect(text).toContain("このまま貼り付けますか？");
    expect(text).toContain("検出された項目");
    expect(text).toContain("安全化プレビュー");
    expect(text).toContain("AI文脈チェック");
    expect(text).toContain("重大リスク件数\n1");
    expect(text).toContain("ブラウザ内で実行");
    expect(text).toContain("AI文脈チェックは手動で実行できます。");
  });
});
