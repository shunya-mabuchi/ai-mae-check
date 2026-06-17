import { describe, expect, it } from "vitest";
import { createBridgeErrorFallbackResult } from "../src/lib/llmBridgeClient";

describe("createBridgeErrorFallbackResult", () => {
  it("bridgeのJSON読み取り失敗errorを非致命の文脈チェック結果に変換する", () => {
    const result = createBridgeErrorFallbackResult({
      request: {
        type: "analyze",
        requestId: "request-1",
        inputText:
          "佐藤様向けに Project Blue Bridge の提案メモを作ります。候補者の山田花子さんについても確認します。",
        modelId: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
        options: {
          maxCandidates: 12
        }
      },
      startedAt: performance.now(),
      message: "AI文脈チェックの結果を読み取れませんでした。ルールベースの検出結果は引き続き利用できます。"
    });

    expect(result).not.toBeNull();
    expect(result?.error).toBeUndefined();
    expect(result?.errorDetail).toBeUndefined();
    expect(result?.summary).toBe("ブラウザ内の補助検出で注意候補を確認しました。安全化対象を選んで続行できます。");
    expect(result?.candidates.map((candidate) => candidate.surface)).toContain("Project Blue Bridge");
    expect(result?.candidates.map((candidate) => candidate.surface)).toContain("山田花子さん");
  });

  it("bridgeの出力形式読み取り失敗errorも非致命の文脈チェック結果に変換する", () => {
    const result = createBridgeErrorFallbackResult({
      request: {
        type: "analyze",
        requestId: "request-output-format",
        inputText: "佐藤様向けに Project Blue Bridge の提案メモを作ります。",
        modelId: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
        options: {}
      },
      startedAt: performance.now(),
      message: "AI文脈チェックの出力形式は読み取れませんでした"
    });

    expect(result).not.toBeNull();
    expect(result?.error).toBeUndefined();
    expect(result?.summary).toBe("ブラウザ内の補助検出で注意候補を確認しました。安全化対象を選んで続行できます。");
    expect(result?.candidates.map((candidate) => candidate.surface)).toContain("Project Blue Bridge");
  });

  it("WebGPUやWorkerの実行不能errorはfallbackにしない", () => {
    const result = createBridgeErrorFallbackResult({
      request: {
        type: "analyze",
        requestId: "request-2",
        inputText: "テスト",
        modelId: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
        options: {}
      },
      startedAt: performance.now(),
      message: "No available WebGPU adapters"
    });

    expect(result).toBeNull();
  });
});
