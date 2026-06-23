import {
  detectSensitiveText,
  evaluateDlpPolicy,
  type DetectionResult,
  type DetectorRule
} from "@ai-mae-check/core";
import type { PasteReviewModalMode } from "../lib/pasteReviewModalCopy";
import { disabledRuleIds, isSiteEnabled, type AiMaeCheckSettings } from "../lib/settings";
import { shouldOfferContextCheck } from "./dom/contextHints";
import { evaluatePasteGuard, type PasteGuardAction } from "./dom/pasteGuard";

export type PasteReviewMode = Extract<PasteReviewModalMode, "default" | "paste_guard">;

export interface ContentReviewRequest {
  inputText: string;
  detection: DetectionResult;
}

export interface PasteReviewRequest extends ContentReviewRequest {
  mode: PasteReviewModalMode;
}

export interface ContentGuardContext {
  settings: AiMaeCheckSettings;
  disabledRuleIds: string[];
  remoteRules: DetectorRule[];
  llmEnabled: boolean;
}

export type PasteReviewPlan =
  | {
      type: "allow";
    }
  | {
      type: "review";
      request: PasteReviewRequest;
    };

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

export function createContentGuardContext(options: ContentDetectionOptions): ContentGuardContext {
  return {
    settings: options.settings,
    disabledRuleIds: disabledRuleIds(options.settings),
    remoteRules: options.remoteRules,
    llmEnabled: options.settings.llm.enabled
  };
}

export function pasteReviewModeForAction(action: Extract<PasteGuardAction, "confirm" | "sanitize_required">): PasteReviewMode {
  return action === "sanitize_required" ? "paste_guard" : "default";
}

export function createPasteReviewPlan(inputText: string, context: ContentGuardContext): PasteReviewPlan {
  const guard = evaluatePasteGuard(inputText, {
    disabledRuleIds: context.disabledRuleIds,
    extraRules: context.remoteRules
  });

  if (guard.action !== "allow") {
    return {
      type: "review",
      request: {
        inputText,
        detection: guard.detection,
        mode: pasteReviewModeForAction(guard.action)
      }
    };
  }

  if (context.llmEnabled && shouldOfferContextCheck(inputText, guard.detection.findings)) {
    return {
      type: "review",
      request: {
        inputText,
        detection: guard.detection,
        mode: "context_check"
      }
    };
  }

  return { type: "allow" };
}

export function createSendReviewRequest(inputText: string, context: ContentGuardContext): ContentReviewRequest | null {
  const detection = createContentDetection(inputText, context);
  const policy = evaluateDlpPolicy(detection.findings);

  if (detection.findings.length === 0 || policy.action === "allow") {
    return null;
  }

  return {
    inputText,
    detection
  };
}
