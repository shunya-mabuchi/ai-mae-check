import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MODEL_ID } from "@ai-mae-check/llm";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  migrateSettings,
  normalizeSettings,
  resetSettings,
  saveSettings,
  SETTINGS_KEY,
  SETTINGS_SCHEMA_VERSION,
  validateSettings
} from "../src/lib/settings";

describe("settings", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("初期設定にsettingsVersionと正式対応モデルを含める", () => {
    expect(DEFAULT_SETTINGS.settingsVersion).toBe(SETTINGS_SCHEMA_VERSION);
    expect(DEFAULT_SETTINGS.llm.modelId).toBe(DEFAULT_MODEL_ID);
  });

  it("古い設定を現在のスキーマへマイグレーションする", () => {
    const settings = migrateSettings({
      enabled: false,
      sites: {
        chatgpt: false,
        unknown: false
      },
      rules: {
        email: false,
        unknown_rule: false
      },
      llm: {
        enabled: true,
        modelId: "SmolLM2-360M-Instruct-q4f32_1-MLC",
        mode: "auto"
      },
      pastedText: "保存してはいけない本文"
    });

    expect(settings.settingsVersion).toBe(SETTINGS_SCHEMA_VERSION);
    expect(settings.enabled).toBe(false);
    expect(settings.sites.chatgpt).toBe(false);
    expect(settings.sites.claude).toBe(true);
    expect(settings.rules.email).toBe(false);
    expect(settings.rules.unknown_rule).toBeUndefined();
    expect(settings.llm.modelId).toBe("SmolLM2-360M-Instruct-q4f32_1-MLC");
    expect(settings.llm.mode).toBe("auto");
    expect("pastedText" in settings).toBe(false);
  });

  it("壊れた設定値は初期値へ戻す", () => {
    const settings = normalizeSettings({
      settingsVersion: "bad",
      enabled: "yes",
      sites: {
        chatgpt: "off"
      },
      rules: {
        email: "off"
      },
      llm: {
        enabled: "true",
        modelId: "   ",
        mode: "sometimes"
      }
    });

    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings).not.toBe(DEFAULT_SETTINGS);
  });

  it("読み込み時に保存済み設定をマイグレーションする", async () => {
    const get = vi.fn((_key: string, callback: (items: Record<string, unknown>) => void) => {
      callback({
        [SETTINGS_KEY]: {
          enabled: false,
          llm: {
            mode: "auto"
          }
        }
      });
    });
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get
        }
      }
    });

    const settings = await loadSettings();

    expect(get).toHaveBeenCalledWith(SETTINGS_KEY, expect.any(Function));
    expect(settings.settingsVersion).toBe(SETTINGS_SCHEMA_VERSION);
    expect(settings.enabled).toBe(false);
    expect(settings.llm.mode).toBe("auto");
  });

  it("保存時に正規化済み設定だけをchrome.storage.localへ保存する", async () => {
    const set = vi.fn((_value: unknown, callback: () => void) => {
      callback();
    });
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          set
        }
      }
    });

    await saveSettings({
      ...DEFAULT_SETTINGS,
      settingsVersion: 0,
      llm: {
        ...DEFAULT_SETTINGS.llm,
        modelId: "   ",
        mode: "manual"
      }
    });

    expect(set).toHaveBeenCalledWith(
      {
        [SETTINGS_KEY]: {
          ...DEFAULT_SETTINGS,
          settingsVersion: SETTINGS_SCHEMA_VERSION
        }
      },
      expect.any(Function)
    );
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
    expect(settings).not.toBe(DEFAULT_SETTINGS);
  });

  it("設定不足を検証メッセージとして返す", () => {
    const result = validateSettings({
      ...DEFAULT_SETTINGS,
      settingsVersion: 0,
      sites: {},
      rules: {},
      llm: {
        ...DEFAULT_SETTINGS.llm,
        modelId: "",
        mode: "bad"
      }
    });

    expect(result.valid).toBe(false);
    expect(result.messages).toEqual(
      expect.arrayContaining([
        "設定バージョンが古いか不正です。現在の形式に補完されます。",
        "対象サイト設定に不足があります。不足分は初期値で補完されます。",
        "検出ルール設定に不足があります。不足分は初期値で補完されます。",
        "WebLLMモデルIDが空です。初期モデルを利用してください。",
        "AI文脈チェックの実行モードが不正です。手動実行または自動実行を選んでください。"
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
