export type SiteId = "chatgpt" | "openai_chat" | "claude" | "gemini" | "perplexity";

export interface TargetSite {
  id: SiteId;
  label: string;
  hostnames: string[];
  matches: string[];
}

export const targetSites: TargetSite[] = [
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
    hostnames: ["www.perplexity.ai"],
    matches: ["https://www.perplexity.ai/*"]
  }
];

export const targetMatches = targetSites.flatMap((site) => site.matches);

export function siteIdFromHostname(hostname: string): SiteId | null {
  return targetSites.find((site) => site.hostnames.includes(hostname))?.id ?? null;
}
