import { afterEach, describe, expect, it, vi } from "vitest";
import { createConfirmModalElements } from "../src/ui/confirmModalElements";
import { allElements, asDomElement, FakeElement, joinedText, stubFakeDocument } from "./helpers/fakeDom";

describe("createConfirmModalElements", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("送信前確認モーダルのブランドマークを文字ではなくアイコンで表示する", () => {
    stubFakeDocument();

    const elements = createConfirmModalElements({
      title: "送信前に安全化しますか？",
      description: "安全化なしでは送信できません。",
      previewTitle: "送信される内容",
      llmTitle: "WebLLMによる文脈チェック",
      llmButtonLabel: "AIチェック",
      llmButtonTitle: "AI文脈チェックを実行します",
      cancelButtonLabel: "キャンセル",
      initialLlmMessage: "AI文脈チェックは手動で実行できます。",
      initialStatusMessage: "安全化後の内容を確認してください。",
      categoryPanelTitle: "確認するカテゴリ",
      summaryItems: [{ label: "判定", value: "高" }]
    });

    const text = joinedText(asDomElement<FakeElement>(elements.overlay));
    expect(text).toContain("AIまえチェック");
    expect(text).toContain("送信前チェック");

    const brandMark = allElements(asDomElement<FakeElement>(elements.overlay)).find(
      (element) => element.className === "amc-brand-mark"
    );
    expect(brandMark?.textContent).toBe("");
    expect(brandMark?.children[0]?.tagName).toBe("img");
    expect(brandMark?.children[0]?.className).toBe("amc-brand-mark-image");
  });
});
