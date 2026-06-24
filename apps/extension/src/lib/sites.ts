declare const __AI_MAE_EXTENSION_E2E__: boolean;

export type SiteId = "chatgpt" | "openai_chat" | "claude" | "gemini" | "perplexity" | "extension_e2e";

export interface TargetSite {
  id: SiteId;
  label: string;
  hostnames: string[];
  matches: string[];
}

const releaseTargetSites: TargetSite[] = [
  {
    id: "chatgpt",
    label: "ChatGPT",
    hostnames: ["chatgpt.com"],
    matches: ["https://chatgpt.com/*"]
  },
  {
    id: "openai_chat",
    label: "ChatGPT 旧URL",
    hostnames: ["chat.openai.com"],
    matches: ["https://chat.openai.com/*"]
  },
  {
    id: "claude",
    label: "Claude",
    hostnames: ["claude.ai"],
    matches: ["https://claude.ai/*"]
  },
  {
    id: "gemini",
    label: "Gemini",
    hostnames: ["gemini.google.com"],
    matches: ["https://gemini.google.com/*"]
  },
  {
    id: "perplexity",
    label: "Perplexity",
    hostnames: ["www.perplexity.ai", "perplexity.ai"],
    matches: ["https://www.perplexity.ai/*", "https://perplexity.ai/*"]
  }
];

const extensionE2eTargetSite: TargetSite = {
  id: "extension_e2e",
  label: "拡張E2E",
  hostnames: ["127.0.0.1", "localhost"],
  matches: ["http://127.0.0.1/*", "http://localhost/*"]
};

const isExtensionE2eBuild =
  typeof __AI_MAE_EXTENSION_E2E__ !== "undefined" && __AI_MAE_EXTENSION_E2E__;

export const targetSites: TargetSite[] = isExtensionE2eBuild
  ? [...releaseTargetSites, extensionE2eTargetSite]
  : releaseTargetSites;

export const targetMatches = targetSites.flatMap((site) => site.matches);

export function siteIdFromHostname(hostname: string): SiteId | null {
  return targetSites.find((site) => site.hostnames.includes(hostname))?.id ?? null;
}
