import { describe, expect, it } from "vitest";
import { createLlmBridgeAnalyzeRequest } from "../src/lib/llmBridgeRequest";
import { buildFinding } from "./testBuilders";

describe("createLlmBridgeAnalyzeRequest", () => {
  it("AI文脈チェック用のanalyze requestを作る", () => {
    const request = createLlmBridgeAnalyzeRequest({
      requestId: "request-1",
      inputText: "A社向けの提案です。",
      modelId: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
      existingFindings: [buildFinding()],
      maxCandidates: 8
    });

    expect(request).toEqual({
      type: "analyze",
      requestId: "request-1",
      inputText: "A社向けの提案です。",
      modelId: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
      options: {
        existingFindings: [buildFinding()],
        maxCandidates: 8
      }
    });
  });

  it("未指定のオプションはrequestへ含めない", () => {
    const request = createLlmBridgeAnalyzeRequest({
      requestId: "request-2",
      inputText: "通常の議事録です。",
      modelId: "Llama-3.2-1B-Instruct-q4f32_1-MLC"
    });

    expect(request.options).toEqual({});
    expect(Object.prototype.hasOwnProperty.call(request.options, "existingFindings")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(request.options, "maxCandidates")).toBe(false);
  });
});
