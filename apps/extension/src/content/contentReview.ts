import {
  detectSensitiveText,
  type DetectionResult,
  type DetectorRule
} from "@ai-mae-check/core";
import { disabledRuleIds, isSiteEnabled, type AiMaeCheckSettings } from "../lib/settings";
import type { PasteGuardAction } from "./dom/pasteGuard";

export type PasteReviewMode = "default" | "paste_guard";

export interface ContentDetectionOptions {
  settings: AiMaeCheckSettings;
  remoteRules: DetectorRule[];
}

export function isContentSiteEnabled(settings: AiMaeCheckSettings, hostname: string): boolean {
  return settings.enabled && isSiteEnabled(settings, hostname);
}

export function createContentDetection(inputText: string, options: ContentDetectionOptions): DetectionResult {
  return detectSensitiveText(inputText, {
    disabledRuleIds: disabledRuleIds(options.settings),
    extraRules: options.remoteRules
  });
}

export function pasteReviewModeForAction(action: Extract<PasteGuardAction, "confirm" | "sanitize_required">): PasteReviewMode {
  return action === "sanitize_required" ? "paste_guard" : "default";
}
