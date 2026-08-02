import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL_ID, getLlmExecutionProfile } from "../src";

describe("getLlmExecutionProfile", () => {
  it("標準と低負荷で同じLlamaモデルを使う", () => {
    expect(getLlmExecutionProfile("standard").modelId).toBe(DEFAULT_MODEL_ID);
    expect(getLlmExecutionProfile("low_resource").modelId).toBe(DEFAULT_MODEL_ID);
  });

  it("低負荷では推論条件を一貫して削減する", () => {
    const standard = getLlmExecutionProfile("standard");
    const lowResource = getLlmExecutionProfile("low_resource");

    expect(lowResource.contextWindowSize).toBeLessThan(standard.contextWindowSize);
    expect(lowResource.maxInputChars).toBeLessThan(standard.maxInputChars);
    expect(lowResource.maxTokens).toBeLessThan(standard.maxTokens);
    expect(lowResource.maxCandidates).toBeLessThan(standard.maxCandidates);
    expect(lowResource.compactPrompt).toBe(true);
  });
});
