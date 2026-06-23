import releaseConfig from "../../config/rule-delivery.release.json";
import { SETTINGS_KEY, type AiMaeCheckSettings } from "./settings";
import { targetSites, type SiteId } from "./sites";

export type WebGpuDiagnosticStatus = "available" | "unavailable" | "error" | "unknown";

interface RuntimeLike {
  getManifest?: () => {
    name?: string;
    version?: string;
  };
}

interface NavigatorLike {
  userAgent?: string;
  gpu?: {
    requestAdapter?: () => Promise<unknown>;
  };
}

export interface PrivacySafeDiagnosticReport {
  generatedAt: string;
  product: {
    name: string;
    extensionVersion: string;
  };
  source: "options_page";
  environment: {
    browser: string;
    os: string;
    webGpu: {
      status: WebGpuDiagnosticStatus;
      reason: string;
    };
  };
  settings: {
    schemaKey: string;
    enabled: boolean;
    enabledSites: SiteId[];
    disabledSites: SiteId[];
    llmEnabled: boolean;
    llmMode: AiMaeCheckSettings["llm"]["mode"];
    llmModelId: string;
    enabledRuleCount: number;
    disabledRuleCount: number;
  };
  ruleDelivery: {
    endpoint: string;
    keyId: string;
    status: "configured" | "disabled";
  };
  privacy: {
    includesUserText: false;
    includesFindings: false;
    includesPlaceholderMap: false;
    includesPageUrl: false;
    note: string;
  };
}

export interface CreatePrivacySafeDiagnosticReportOptions {
  settings: AiMaeCheckSettings;
  now?: Date;
  runtime?: RuntimeLike;
  navigatorLike?: NavigatorLike;
}

const DEFAULT_EXTENSION_NAME = "AIまえチェック";
const DEFAULT_EXTENSION_VERSION = "unknown";

function getDefaultRuntime(): RuntimeLike | undefined {
  return globalThis.chrome?.runtime;
}

function getDefaultNavigator(): NavigatorLike | undefined {
  return globalThis.navigator;
}

function browserFromUserAgent(userAgent: string): string {
  const chromeMatch = /(?:Chrome|Chromium)\/([\d.]+)/.exec(userAgent);
  if (chromeMatch?.[1]) {
    return `Chrome ${chromeMatch[1]}`;
  }

  const edgeMatch = /Edg\/([\d.]+)/.exec(userAgent);
  if (edgeMatch?.[1]) {
    return `Edge ${edgeMatch[1]}`;
  }

  return "unknown";
}

function osFromUserAgent(userAgent: string): string {
  if (/Windows NT/i.test(userAgent)) {
    return "Windows";
  }
  if (/Mac OS X/i.test(userAgent)) {
    return "macOS";
  }
  if (/Android/i.test(userAgent)) {
    return "Android";
  }
  if (/(iPhone|iPad|iPod)/i.test(userAgent)) {
    return "iOS";
  }
  if (/Linux/i.test(userAgent)) {
    return "Linux";
  }

  return "unknown";
}

async function getWebGpuDiagnostic(navigatorLike: NavigatorLike | undefined): Promise<PrivacySafeDiagnosticReport["environment"]["webGpu"]> {
  if (!navigatorLike?.gpu) {
    return {
      status: "unavailable",
      reason: "navigator.gpu is not available"
    };
  }

  if (typeof navigatorLike.gpu.requestAdapter !== "function") {
    return {
      status: "unknown",
      reason: "navigator.gpu.requestAdapter is not available"
    };
  }

  try {
    const adapter = await navigatorLike.gpu.requestAdapter();
    return adapter
      ? {
          status: "available",
          reason: "requestAdapter returned an adapter"
        }
      : {
          status: "unavailable",
          reason: "requestAdapter returned null"
        };
  } catch {
    return {
      status: "error",
      reason: "requestAdapter failed"
    };
  }
}

function siteIdsByEnabledState(settings: AiMaeCheckSettings, enabled: boolean): SiteId[] {
  return targetSites.filter((site) => settings.sites[site.id] === enabled).map((site) => site.id);
}

function countRulesByEnabledState(settings: AiMaeCheckSettings, enabled: boolean): number {
  return Object.values(settings.rules).filter((value) => value === enabled).length;
}

export async function createPrivacySafeDiagnosticReport(
  options: CreatePrivacySafeDiagnosticReportOptions
): Promise<PrivacySafeDiagnosticReport> {
  const runtime = options.runtime ?? getDefaultRuntime();
  const navigatorLike = options.navigatorLike ?? getDefaultNavigator();
  const manifest = runtime?.getManifest?.();
  const userAgent = navigatorLike?.userAgent ?? "";
  const endpoint = releaseConfig.endpoint.trim();
  const webGpu = await getWebGpuDiagnostic(navigatorLike);

  return {
    generatedAt: (options.now ?? new Date()).toISOString(),
    product: {
      name: manifest?.name ?? DEFAULT_EXTENSION_NAME,
      extensionVersion: manifest?.version ?? DEFAULT_EXTENSION_VERSION
    },
    source: "options_page",
    environment: {
      browser: browserFromUserAgent(userAgent),
      os: osFromUserAgent(userAgent),
      webGpu
    },
    settings: {
      schemaKey: SETTINGS_KEY,
      enabled: options.settings.enabled,
      enabledSites: siteIdsByEnabledState(options.settings, true),
      disabledSites: siteIdsByEnabledState(options.settings, false),
      llmEnabled: options.settings.llm.enabled,
      llmMode: options.settings.llm.mode,
      llmModelId: options.settings.llm.modelId,
      enabledRuleCount: countRulesByEnabledState(options.settings, true),
      disabledRuleCount: countRulesByEnabledState(options.settings, false)
    },
    ruleDelivery: {
      endpoint,
      keyId: releaseConfig.keyId,
      status: endpoint.length > 0 ? "configured" : "disabled"
    },
    privacy: {
      includesUserText: false,
      includesFindings: false,
      includesPlaceholderMap: false,
      includesPageUrl: false,
      note: "貼り付け本文、送信本文、検出文字列、placeholderMap、現在のページURLは含めていません。"
    }
  };
}

export function formatPrivacySafeDiagnosticReport(report: PrivacySafeDiagnosticReport): string {
  return JSON.stringify(report, null, 2);
}
