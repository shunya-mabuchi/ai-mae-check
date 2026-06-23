import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MODEL_ID } from "@ai-mae-check/llm";
import { DEFAULT_SETTINGS, normalizeSettings, resetSettings, saveSettings, SETTINGS_KEY, validateSettings } from "../src/lib/settings";

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

  it("設定不足を検証メッセージとして返す", () => {
    const result = validateSettings({
      ...DEFAULT_SETTINGS,
      sites: {},
      rules: {},
      llm: {
        ...DEFAULT_SETTINGS.llm,
        modelId: ""
      }
    });

    expect(result.valid).toBe(false);
    expect(result.messages).toEqual(
      expect.arrayContaining([
        "対象サイト設定に不足があります。不足分は初期値で補完されます。",
        "検出ルール設定に不足があります。不足分は初期値で補完されます。",
        "WebLLMモデルIDが空です。初期モデルを利用してください。"
      ])
    );
  });

  it("保存失敗時は日本語エラーを返す", async () => {
    const set = vi.fn((_value: unknown, callback: () => void) => {
      callback();
    });
    vi.stubGlobal("chrome", {
      runtime: {
        lastError: {
          message: "quota exceeded"
        }
      },
      storage: {
        local: {
          set
        }
      }
    });

    await expect(saveSettings(DEFAULT_SETTINGS)).rejects.toThrow("設定の保存に失敗しました。");
  });
});
