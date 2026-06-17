import { describe, expect, it } from "vitest";
import { createJsonParseBridgeFallbackResult } from "../src/lib/llmBridgeFallback";

describe("createJsonParseBridgeFallbackResult", () => {
  it("JSON読み取り失敗を非致命の文脈チェック結果に変換する", () => {
    const result = createJsonParseBridgeFallbackResult({
      inputText:
        "佐藤様向けに Project Blue Bridge の提案メモを作ります。候補者の山田花子さんについても確認します。",
      modelId: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
      startedAt: performance.now(),
      error: new Error("AI文脈チェックの結果を読み取れませんでした")
    });

    expect(result).not.toBeNull();
    expect(result?.error).toBeUndefined();
    expect(result?.errorDetail).toBeUndefined();
    expect(result?.summary).toBe("ブラウザ内の補助検出で注意候補を確認しました。安全化対象を選んで続行できます。");
    expect(result?.candidates.map((candidate) => candidate.surface)).toContain("Project Blue Bridge");
    expect(result?.candidates.map((candidate) => candidate.surface)).toContain("山田花子さん");
  });

  it("補助候補がないJSON読み取り失敗もエラー詳細を残さず非致命メッセージにする", () => {
    const result = createJsonParseBridgeFallbackResult({
      inputText: "検出しづらい短い文章です。",
      modelId: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
      startedAt: performance.now(),
      error: new Error("AI文脈チェックの結果を読み取れませんでした")
    });

    expect(result).not.toBeNull();
    expect(result?.error).toBeUndefined();
    expect(result?.errorDetail).toBeUndefined();
    expect(result?.candidates).toEqual([]);
    expect(result?.summary).toBe("ルールベース検出結果で安全化できます。AI文脈チェックは必要に応じて再実行してください。");
  });

  it("JSON読み取り失敗以外はbridge側fallbackにしない", () => {
    const result = createJsonParseBridgeFallbackResult({
      inputText: "テスト",
      modelId: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
      startedAt: performance.now(),
      error: new Error("No available WebGPU adapters")
    });

    expect(result).toBeNull();
  });
});
