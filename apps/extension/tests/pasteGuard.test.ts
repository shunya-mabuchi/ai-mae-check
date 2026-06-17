import { describe, expect, it } from "vitest";
import { createPasteReplacement, evaluatePasteGuard } from "../src/content/dom/pasteGuard";

describe("pasteGuard", () => {
  it("秘密情報保護の対象を含むpasteは安全化必須にする", () => {
    const result = evaluatePasteGuard("GITHUB_TOKEN=ghp_dummyDummyDummyDummyDummyDummy123456");

    expect(result.action).toBe("sanitize_required");
    expect(result.rawPasteAllowed).toBe(false);
    expect(result.policy.risk.secretGuard).toBe(true);
  });

  it("mediumリスクは詳細確認に回す", () => {
    const result = evaluatePasteGuard("初期費用は300万円です。");

    expect(result.action).toBe("confirm");
    expect(result.rawPasteAllowed).toBe(true);
    expect(result.policy.risk.level).toBe("medium");
  });

  it("検出がなければ通常貼り付けを許可する", () => {
    const result = evaluatePasteGuard("今日は天気がよいです。");

    expect(result.action).toBe("allow");
    expect(result.rawPasteAllowed).toBe(true);
  });

  it("安全化貼り付け用に検出範囲を汎用表現へ置換する", () => {
    const result = evaluatePasteGuard("メールは taro@example.com です。");
    const replaced = createPasteReplacement(result.inputText, result.detection.findings);

    expect(replaced).toBe("メールは [メールアドレス] です。");
  });
});
