import { detectorRules } from "@harumae/core";
import { DEFAULT_MODEL_ID } from "@harumae/llm";
import { siteIdFromHostname, targetSites, type SiteId } from "./sites";

export const SETTINGS_KEY = "harumae.settings.v1";

export type LlmRunMode = "manual" | "auto";

export interface HarumaeSettings {
  enabled: boolean;
  sites: Record<SiteId, boolean>;
  rules: Record<string, boolean>;
  llm: {
    enabled: boolean;
    modelId: string;
    mode: LlmRunMode;
  };
}

function defaultSites(): Record<SiteId, boolean> {
  return Object.fromEntries(targetSites.map((site) => [site.id, true])) as Record<SiteId, boolean>;
}

function defaultRules(): Record<string, boolean> {
  return Object.fromEntries(detectorRules.map((rule) => [rule.id, true]));
}

export const DEFAULT_SETTINGS: HarumaeSettings = {
  enabled: true,
  sites: defaultSites(),
  rules: defaultRules(),
  llm: {
    enabled: true,
    modelId: DEFAULT_MODEL_ID,
    mode: "manual"
  }
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function booleanEntries(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"));
}

export function normalizeSettings(value: unknown): HarumaeSettings {
  if (!isRecord(value)) {
    return DEFAULT_SETTINGS;
  }

  const sites = {
    ...DEFAULT_SETTINGS.sites,
    ...booleanEntries(value.sites)
  } as Record<SiteId, boolean>;
  const rules = {
    ...DEFAULT_SETTINGS.rules,
    ...booleanEntries(value.rules)
  };
  const llmValue = isRecord(value.llm) ? value.llm : {};

  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : DEFAULT_SETTINGS.enabled,
    sites,
    rules,
    llm: {
      enabled: typeof llmValue.enabled === "boolean" ? llmValue.enabled : DEFAULT_SETTINGS.llm.enabled,
      modelId: typeof llmValue.modelId === "string" && llmValue.modelId.length > 0 ? llmValue.modelId : DEFAULT_SETTINGS.llm.modelId,
      mode: llmValue.mode === "auto" ? "auto" : "manual"
    }
  };
}

export async function loadSettings(): Promise<HarumaeSettings> {
  return new Promise((resolve) => {
    chrome.storage.local.get(SETTINGS_KEY, (items) => {
      resolve(normalizeSettings(items[SETTINGS_KEY]));
    });
  });
}

export async function saveSettings(settings: HarumaeSettings): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [SETTINGS_KEY]: settings }, () => resolve());
  });
}

export function disabledRuleIds(settings: HarumaeSettings): string[] {
  return Object.entries(settings.rules)
    .filter(([, enabled]) => !enabled)
    .map(([ruleId]) => ruleId);
}

export function isSiteEnabled(settings: HarumaeSettings, hostname: string): boolean {
  const siteId = siteIdFromHostname(hostname);
  if (!siteId) {
    return false;
  }

  return settings.sites[siteId] !== false;
}
