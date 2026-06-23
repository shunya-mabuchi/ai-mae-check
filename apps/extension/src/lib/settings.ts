import { detectorRules } from "@ai-mae-check/core";
import { DEFAULT_MODEL_ID } from "@ai-mae-check/llm";
import { siteIdFromHostname, targetSites, type SiteId } from "./sites";

export const SETTINGS_KEY = "ai-mae-check.settings.v1";
export const SETTINGS_SCHEMA_VERSION = 1;

export type LlmRunMode = "manual" | "auto";

export interface AiMaeCheckSettings {
  settingsVersion: number;
  enabled: boolean;
  sites: Record<SiteId, boolean>;
  rules: Record<string, boolean>;
  llm: {
    enabled: boolean;
    modelId: string;
    mode: LlmRunMode;
  };
}

export interface SettingsValidationResult {
  valid: boolean;
  messages: string[];
}

function defaultSites(): Record<SiteId, boolean> {
  return Object.fromEntries(targetSites.map((site) => [site.id, true])) as Record<SiteId, boolean>;
}

function defaultRules(): Record<string, boolean> {
  return Object.fromEntries(detectorRules.map((rule) => [rule.id, true] as const));
}

function createDefaultSettings(): AiMaeCheckSettings {
  return {
    settingsVersion: SETTINGS_SCHEMA_VERSION,
    enabled: true,
    sites: defaultSites(),
    rules: defaultRules(),
    llm: {
      enabled: true,
      modelId: DEFAULT_MODEL_ID,
      mode: "manual"
    }
  };
}

export const DEFAULT_SETTINGS: AiMaeCheckSettings = createDefaultSettings();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeKnownBooleanMap<T extends string>(
  ids: readonly T[],
  value: unknown,
  defaults: Record<T, boolean>
): Record<T, boolean> {
  const source = isRecord(value) ? value : {};

  return Object.fromEntries(
    ids.map((id) => [id, typeof source[id] === "boolean" ? source[id] : defaults[id]])
  ) as Record<T, boolean>;
}

function normalizeRuleSettings(value: unknown, defaults: Record<string, boolean>): Record<string, boolean> {
  const source = isRecord(value) ? value : {};

  return Object.fromEntries(
    detectorRules.map((rule) => [rule.id, typeof source[rule.id] === "boolean" ? source[rule.id] : defaults[rule.id]])
  ) as Record<string, boolean>;
}

function normalizeModelId(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : DEFAULT_SETTINGS.llm.modelId;
}

function normalizeLlmMode(value: unknown): LlmRunMode {
  return value === "auto" ? "auto" : "manual";
}

export function migrateSettings(value: unknown): AiMaeCheckSettings {
  if (!isRecord(value)) {
    return createDefaultSettings();
  }

  const defaults = createDefaultSettings();
  const llmValue = isRecord(value.llm) ? value.llm : {};

  return {
    settingsVersion: SETTINGS_SCHEMA_VERSION,
    enabled: readBoolean(value.enabled, defaults.enabled),
    sites: normalizeKnownBooleanMap(
      targetSites.map((site) => site.id),
      value.sites,
      defaults.sites
    ),
    rules: normalizeRuleSettings(value.rules, defaults.rules),
    llm: {
      enabled: readBoolean(llmValue.enabled, defaults.llm.enabled),
      modelId: normalizeModelId(llmValue.modelId),
      mode: normalizeLlmMode(llmValue.mode)
    }
  };
}

export function normalizeSettings(value: unknown): AiMaeCheckSettings {
  return migrateSettings(value);
}

function chromeStorageErrorMessage(action: "読み込み" | "保存" | "初期化"): string | null {
  const message = chrome.runtime?.lastError?.message;
  return message
    ? `設定の${action}に失敗しました。Chromeの拡張機能ストレージを確認してください。詳細: ${message}`
    : null;
}

export function validateSettings(settings: AiMaeCheckSettings): SettingsValidationResult {
  const messages: string[] = [];
  const missingSites = targetSites.filter((site) => typeof settings.sites?.[site.id] !== "boolean");
  const missingRules = detectorRules.filter((rule) => typeof settings.rules?.[rule.id] !== "boolean");

  if (settings.settingsVersion !== SETTINGS_SCHEMA_VERSION) {
    messages.push("設定バージョンが古いか不正です。現在の形式に補完されます。");
  }
  if (missingSites.length > 0) {
    messages.push("対象サイト設定に不足があります。不足分は初期値で補完されます。");
  }
  if (missingRules.length > 0) {
    messages.push("検出ルール設定に不足があります。不足分は初期値で補完されます。");
  }
  if (settings.llm.modelId.trim().length === 0) {
    messages.push("WebLLMモデルIDが空です。初期モデルを利用してください。");
  }
  if (settings.llm.mode !== "manual" && settings.llm.mode !== "auto") {
    messages.push("AI文脈チェックの実行モードが不正です。手動実行または自動実行を選んでください。");
  }

  return {
    valid: messages.length === 0,
    messages
  };
}

export async function loadSettings(): Promise<AiMaeCheckSettings> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(SETTINGS_KEY, (items) => {
      const errorMessage = chromeStorageErrorMessage("読み込み");
      if (errorMessage) {
        reject(new Error(errorMessage));
        return;
      }
      resolve(normalizeSettings(items[SETTINGS_KEY]));
    });
  });
}

export async function saveSettings(settings: AiMaeCheckSettings): Promise<void> {
  const normalizedSettings = normalizeSettings(settings);

  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [SETTINGS_KEY]: normalizedSettings }, () => {
      const errorMessage = chromeStorageErrorMessage("保存");
      if (errorMessage) {
        reject(new Error(errorMessage));
        return;
      }
      resolve();
    });
  });
}

export async function resetSettings(): Promise<AiMaeCheckSettings> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(SETTINGS_KEY, () => {
      const errorMessage = chromeStorageErrorMessage("初期化");
      if (errorMessage) {
        reject(new Error(errorMessage));
        return;
      }
      resolve(createDefaultSettings());
    });
  });
}

export function disabledRuleIds(settings: AiMaeCheckSettings): string[] {
  return Object.entries(settings.rules)
    .filter(([, enabled]) => !enabled)
    .map(([ruleId]) => ruleId);
}

export function isSiteEnabled(settings: AiMaeCheckSettings, hostname: string): boolean {
  const siteId = siteIdFromHostname(hostname);
  if (!siteId) {
    return false;
  }

  return settings.sites[siteId] !== false;
}
