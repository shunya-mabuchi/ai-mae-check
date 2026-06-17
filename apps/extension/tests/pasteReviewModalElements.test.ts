import { afterEach, describe, expect, it, vi } from "vitest";
import type { PasteReviewSummaryItem } from "../src/lib/pasteReviewSummaryView";
import { createPasteReviewModalElements } from "../src/lib/pasteReviewModalElements";

class FakeElement {
  className = "";
  textContent = "";
  readonly children: FakeElement[] = [];

  constructor(readonly tagName: string) {}

  append(...children: FakeElement[]): void {
    this.children.push(...children);
  }
}

function stubDocument(): void {
  vi.stubGlobal("document", {
    createElement: vi.fn((tagName: string) => new FakeElement(tagName))
  });
}

function allElements(root: FakeElement): FakeElement[] {
  return [root, ...root.children.flatMap(allElements)];
}

function joinedText(root: FakeElement): string {
  return allElements(root)
    .map((element) => element.textContent)
    .filter((text) => text.length > 0)
    .join("\n");
}

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
    stubDocument();

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
    expect(elements.list.className).toBe("hm-list");
    expect(elements.preview.className).toBe("hm-preview");
    expect(elements.llmStatus.className).toBe("hm-llm-status");
    expect(elements.footerNote.className).toBe("hm-footer-note");
    expect(elements.maskButton.textContent).toBe("安全化して入力");
    expect(elements.llmButton.textContent).toBe("AI文脈チェックも実行");
    expect(elements.rawButton.textContent).toBe("そのまま貼り付け");
    expect(elements.cancelButton.textContent).toBe("キャンセル");

    const text = joinedText(elements.overlay as unknown as FakeElement);
    expect(text).toContain("このまま貼り付けますか？");
    expect(text).toContain("検出項目一覧");
    expect(text).toContain("安全化後プレビュー");
    expect(text).toContain("WebLLMによる文脈チェック");
    expect(text).toContain("重大リスク件数\n1");
    expect(text).toContain("AI文脈チェックは手動で実行できます。");
  });
});
