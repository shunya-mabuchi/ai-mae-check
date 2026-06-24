import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Options Page onboarding", () => {
  it("初回ユーザー向けに拡張本体・対象サイト・WebLLM初回ロードを説明する", () => {
    const source = [
      readFileSync(resolve(process.cwd(), "entrypoints/options/OptionsApp.tsx"), "utf8"),
      readFileSync(resolve(process.cwd(), "entrypoints/options/OptionsSections.tsx"), "utf8")
    ].join("\n");

    expect(source).toContain("AIまえチェックの本体はChrome拡張です");
    expect(source).toContain("ChatGPT、Claude、Gemini、Perplexity");
    expect(source).toContain("貼り付け前・送信前に確認モーダルを表示します");
    expect(source).toContain("WebLLMは手動実行が初期設定です");
    expect(source).toContain("初回利用時はローカル推論用モデルファイルの取得に時間がかかる場合があります");
    expect(source).toContain("貼り付け本文、送信本文、検出結果、placeholderMap、送信履歴は保存しません");
  });
});
