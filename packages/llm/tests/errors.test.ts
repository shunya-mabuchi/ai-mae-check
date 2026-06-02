import { describe, expect, it } from "vitest";
import { formatLlmErrorMessage } from "../src";

describe("formatLlmErrorMessage", () => {
  it("モデル取得のネットワーク失敗を日本語で説明する", () => {
    const message = formatLlmErrorMessage(new Error("net::ERR_NETWORK_ACCESS_DENIED https://huggingface.co/model"));

    expect(message).toContain("ローカルAIモデルの取得に失敗しました");
    expect(message).toContain("ルールベースの検出結果は引き続き利用できます");
  });

  it("不明なエラーでは汎用メッセージにする", () => {
    const message = formatLlmErrorMessage(new Error("unknown internal error"));

    expect(message).toBe("AI文脈チェックを実行できませんでした。ルールベースの検出結果は引き続き利用できます。");
  });
});
