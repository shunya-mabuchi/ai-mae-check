import type { SiteAdapter } from "./baseAdapter";
import { chatgptAdapter } from "./chatgptAdapter";
import { claudeAdapter } from "./claudeAdapter";
import { geminiAdapter } from "./geminiAdapter";
import { perplexityAdapter } from "./perplexityAdapter";
import { siteIdFromHostname } from "../../lib/sites";

export function adapterForHostname(hostname: string): SiteAdapter | null {
  const normalized = hostname.toLowerCase();

  if (normalized === "chatgpt.com" || normalized === "chat.openai.com") {
    return chatgptAdapter;
  }

  if (normalized === "claude.ai") {
    return claudeAdapter;
  }

  if (normalized === "gemini.google.com") {
    return geminiAdapter;
  }

  if (normalized === "www.perplexity.ai" || normalized === "perplexity.ai") {
    return perplexityAdapter;
  }

  if (siteIdFromHostname(normalized) === "extension_e2e") {
    return chatgptAdapter;
  }

  return null;
}
