import { describe, expect, it } from "vitest";
import {
  classifyLlmError,
  formatLlmErrorMessage,
  isContextAnalysisExecutionError,
  sanitizeLlmErrorDetail
} from "../src";

describe("AI文脈チェックのエラー処理", () => {
  it("モデル取得失敗を日本語で説明する", () => {
    const detail = classifyLlmError(new Error("Failed to fetch https://huggingface.co/model"));
    expect(detail.kind).toBe("model_fetch");
    expect(formatLlmErrorMessage(new Error("Failed to fetch"))).toContain("モデルの取得に失敗しました");
  });

  it("WASM実行環境の失敗を分類する", () => {
    expect(classifyLlmError(new Error("no available backend found for wasm")).kind).toBe("wasm");
  });

  it("errorがある結果だけを実行不能として扱う", () => {
    expect(isContextAnalysisExecutionError({ error: "失敗", errorDetail: undefined })).toBe(true);
    expect(isContextAnalysisExecutionError({ error: undefined, errorDetail: undefined })).toBe(false);
  });

  it("technicalDetailへユーザー本文を混ぜない", () => {
    const detail = sanitizeLlmErrorDetail(
      {
        kind: "unknown",
        message: "AI文脈チェックを実行できませんでした。",
        hint: "接続を確認してください。",
        technicalDetail: "input: 山田花子の連絡先 taro@example.com"
      },
      "山田花子の連絡先 taro@example.com"
    );
    expect(detail.technicalDetail).not.toContain("山田花子");
    expect(detail.technicalDetail).not.toContain("taro@example.com");
  });

  it("埋め込み済みerrorDetailも再度サニタイズする", () => {
    const error = Object.assign(new Error("失敗"), {
      llmErrorDetail: {
        kind: "worker",
        message: "input: 秘密本文",
        hint: "content: 秘密本文",
        technicalDetail: "秘密本文"
      }
    });
    const detail = classifyLlmError(error);
    expect(JSON.stringify(detail)).not.toContain("秘密本文");
  });
});
