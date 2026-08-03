import { describe, expect, it } from "vitest";
import { createLlmBridgeAnalyzeRequest, createLlmBridgeModelStateRequest } from "../src/lib/llmBridgeRequest";
import { buildFinding } from "./testBuilders";

describe("createLlmBridgeAnalyzeRequest", () => {
  it("AI文脈チェック用のanalyze requestを作る", () => {
    const request = createLlmBridgeAnalyzeRequest({
      requestId: "request-1",
      inputText: "A社向けの提案です。",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "low_resource",
      existingFindings: [buildFinding()],
      maxCandidates: 8
    });

    expect(request).toEqual({
      type: "analyze",
      requestId: "request-1",
      inputText: "A社向けの提案です。",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "low_resource",
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
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "standard"
    });

    expect(request.options).toEqual({});
    expect(Object.prototype.hasOwnProperty.call(request.options, "existingFindings")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(request.options, "maxCandidates")).toBe(false);
  });

  it("WebLLMモデル準備状態のrequestを作る", () => {
    expect(createLlmBridgeModelStateRequest("state-1", "gemma3-1b-it-q4f16_1-MLC", "standard")).toEqual({
      type: "model-state",
      requestId: "state-1",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "standard",
      options: {}
    });
  });
});
