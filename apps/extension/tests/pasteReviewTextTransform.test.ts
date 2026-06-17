import { detectSensitiveText } from "@ai-mae-check/core";
import { describe, expect, it } from "vitest";
import { createPasteReviewInsertText, createPasteReviewPreviewText } from "../src/lib/pasteReviewTextTransform";

describe("pasteReviewTextTransform", () => {
  const input = "メールは taro@example.com です。";
  const findings = detectSensitiveText(input).findings;

  it("プレビューは日本語ラベルで安全化した結果を返す", () => {
    expect(createPasteReviewPreviewText(input, findings)).toBe("メールは [メールアドレス] です。");
  });

  it("通常モードの挿入テキストは日本語ラベルで安全化した結果を返す", () => {
    expect(createPasteReviewInsertText(input, findings, "default")).toBe("メールは [メールアドレス] です。");
  });

  it("paste_guardモードの挿入テキストも同じ安全化結果を返す", () => {
    expect(createPasteReviewInsertText(input, findings, "paste_guard")).toBe("メールは [メールアドレス] です。");
  });

  it("context_checkモードの挿入テキストも同じ安全化結果を返す", () => {
    expect(createPasteReviewInsertText(input, findings, "context_check")).toBe("メールは [メールアドレス] です。");
  });
});
