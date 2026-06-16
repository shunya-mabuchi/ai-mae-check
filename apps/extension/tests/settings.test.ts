import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL_ID } from "@ai-mae-check/llm";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/lib/settings";

describe("settings", () => {
  it("AI文脈チェックの初期実行モデルは正式対応モデルにする", () => {
    expect(DEFAULT_SETTINGS.llm.modelId).toBe(DEFAULT_MODEL_ID);
  });

  it("保存済みの古いモデルIDは正式対応モデルへ正規化する", () => {
    const settings = normalizeSettings({
      llm: {
        enabled: true,
        modelId: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
        mode: "manual"
      }
    });

    expect(settings.llm.modelId).toBe(DEFAULT_MODEL_ID);
  });
});
