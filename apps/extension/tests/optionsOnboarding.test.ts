import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Options Page onboarding", () => {
  it("初回ユーザー向けに拡張本体・対象サイト・ブラウザ内AI初回ロードを説明する", () => {
    const source = [
      readFileSync(resolve(process.cwd(), "entrypoints/options/OptionsApp.tsx"), "utf8"),
      readFileSync(resolve(process.cwd(), "entrypoints/options/OptionsSections.tsx"), "utf8")
    ].join("\n");

    expect(source).toContain("AIまえチェックの本体はChrome拡張です");
    expect(source).toContain("ChatGPT、Claude、Gemini、Perplexity");
    expect(source).toContain("貼り付け前・送信前に確認モーダルを表示します");
    expect(source).toContain("CPU文脈チェックは手動実行が初期設定です");
    expect(source).toContain("初回利用時はローカル推論用モデルファイルの取得に時間がかかる場合があります");
    expect(source).toContain("Ruri-v3-30m");
    expect(source).toContain("日本語NERモデル");
    expect(source).toContain("ブラウザ内AIモデル");
    expect(source).toContain("CPU / WebAssembly上で動作");
    expect(source).toContain("結果は注意候補として扱います");
    expect(source).toContain("端末メモリ、保存領域、モデル取得先への接続状況によっては実行できない場合があります");
    expect(source).toContain("あなた自身の推論サーバーや外部LLM APIは利用しません");
    expect(source).toContain("貼り付け本文、送信本文、検出結果、placeholderMap、送信履歴は保存しません");
  });
});
