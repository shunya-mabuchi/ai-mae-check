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
    expect(source).toContain("どちらも同じQwen2.5 0.5Bモデルを使います");
    expect(source).toContain("CPUフォールバックモデル");
    expect(source).toContain("Apache License 2.0");
    expect(source).toContain("入力長、出力長、候補数、context windowを抑えてGPU負荷を下げます");
    expect(source).toContain("失敗が続く場合はCPU文脈チェックへ切り替えます");
    expect(source).toContain("CPU文脈チェックも端末メモリ、保存領域、モデル取得先への接続状況によっては実行できない場合があります");
    expect(source).toContain("貼り付け本文、送信本文、検出結果、placeholderMap、送信履歴は保存しません");
  });
});
