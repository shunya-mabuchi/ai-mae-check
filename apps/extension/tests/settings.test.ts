import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MODEL_ID } from "@ai-mae-check/llm";
import { DEFAULT_SETTINGS, normalizeSettings, resetSettings, SETTINGS_KEY } from "../src/lib/settings";

describe("settings", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("AI文脈チェックの初期実行モデルは正式対応モデルにする", () => {
    expect(DEFAULT_SETTINGS.llm.modelId).toBe(DEFAULT_MODEL_ID);
  });

  it("保存済みのモデルIDは保持し、実行時のresolveModelIdでfallbackできるようにする", () => {
    const settings = normalizeSettings({
      llm: {
        enabled: true,
        modelId: "SmolLM2-360M-Instruct-q4f32_1-MLC",
        mode: "manual"
      }
    });

    expect(settings.llm.modelId).toBe("SmolLM2-360M-Instruct-q4f32_1-MLC");
  });

  it("保存済み設定を削除して初期設定を返す", async () => {
    const remove = vi.fn((key: string, callback: () => void) => {
      callback();
    });
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          remove
        }
      }
    });

    const settings = await resetSettings();

    expect(remove).toHaveBeenCalledWith(SETTINGS_KEY, expect.any(Function));
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });
});
