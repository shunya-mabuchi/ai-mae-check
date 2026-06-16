import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL_ID } from "@ai-mae-check/llm";
import { DEFAULT_SETTINGS } from "../src/lib/settings";

describe("settings", () => {
  it("AI文脈チェックの初期実行モデルは軽量互換モデルにする", () => {
    expect(DEFAULT_SETTINGS.llm.modelId).toBe(DEFAULT_MODEL_ID);
  });
});
