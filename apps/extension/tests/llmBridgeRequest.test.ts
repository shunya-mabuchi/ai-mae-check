import { describe, expect, it } from "vitest";
import { createLlmBridgeAnalyzeRequest } from "../src/lib/llmBridgeRequest";

describe("createLlmBridgeAnalyzeRequest", () => {
  it("ブラウザ内AIチェック用のrequestをモデル指定なしで作る", () => {
    expect(createLlmBridgeAnalyzeRequest({
      requestId: "request-1",
      inputText: "A社向けの提案です。",
      maxCandidates: 8
    })).toEqual({
      type: "analyze-context",
      requestId: "request-1",
      inputText: "A社向けの提案です。",
      options: { maxCandidates: 8 }
    });
  });

  it("未指定のオプションはrequestへ含めない", () => {
    const request = createLlmBridgeAnalyzeRequest({
      requestId: "request-2",
      inputText: "通常の議事録です。"
    });

    expect(request.options).toEqual({});
    expect(Object.prototype.hasOwnProperty.call(request, "modelId")).toBe(false);
  });
});
