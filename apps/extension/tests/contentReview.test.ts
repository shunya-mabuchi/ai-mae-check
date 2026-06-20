import { describe, expect, it } from "vitest";
import type { DetectorRule } from "@ai-mae-check/core";
import { adapterForHostname } from "../src/content/adapters";
import { DEFAULT_SETTINGS } from "../src/lib/settings";
import {
  createContentDetection,
  createContentGuardContext,
  createPasteReviewPlan,
  createSendReviewRequest,
  isContentSiteEnabled,
  pasteReviewModeForAction
} from "../src/content/contentReview";

describe("contentReview", () => {
  it("merges remote rules with local settings", () => {
    const remoteRule: DetectorRule = {
      id: "dummy_project",
      label: "Dummy project",
      riskLevel: "medium",
      enabled: true,
      createFindings: (input) => {
        const start = input.indexOf("Project Secret");
        if (start < 0) {
          return [];
        }

        return [
          {
            id: "rule:dummy_project:0:1",
            ruleId: "dummy_project",
            source: "rule",
            label: "Dummy project",
            riskLevel: "medium",
            start,
            end: start + "Project Secret".length,
            text: "Project Secret",
            placeholder: "[PROJECT_1]",
            message: "Project names are masked by the remote rule.",
            confidence: 0.9
          }
        ];
      }
    };

    const detection = createContentDetection("taro@example.com and Project Secret", {
      settings: {
        ...DEFAULT_SETTINGS,
        rules: {
          ...DEFAULT_SETTINGS.rules,
          email: false
        }
      },
      remoteRules: [remoteRule]
    });

    expect(detection.findings.map((finding) => finding.ruleId)).toEqual(["dummy_project"]);
  });

  it("builds guard context from current settings", () => {
    const context = createContentGuardContext({
      settings: {
        ...DEFAULT_SETTINGS,
        llm: {
          ...DEFAULT_SETTINGS.llm,
          enabled: false
        },
        rules: {
          ...DEFAULT_SETTINGS.rules,
          email: false
        }
      },
      remoteRules: []
    });

    expect(context.disabledRuleIds).toEqual(["email"]);
    expect(context.llmEnabled).toBe(false);
  });

  it("reflects global and per-site settings", () => {
    expect(isContentSiteEnabled(DEFAULT_SETTINGS, "chatgpt.com")).toBe(true);
    expect(isContentSiteEnabled({ ...DEFAULT_SETTINGS, enabled: false }, "chatgpt.com")).toBe(false);
    expect(
      isContentSiteEnabled(
        {
          ...DEFAULT_SETTINGS,
          sites: {
            ...DEFAULT_SETTINGS.sites,
            chatgpt: false
          }
        },
        "chatgpt.com"
      )
    ).toBe(false);
  });

  it("maps paste guard actions to review modes", () => {
    expect(pasteReviewModeForAction("sanitize_required")).toBe("paste_guard");
    expect(pasteReviewModeForAction("confirm")).toBe("default");
  });

  it("creates a paste-guard review plan for secret material", () => {
    const context = createContentGuardContext({
      settings: DEFAULT_SETTINGS,
      remoteRules: []
    });

    const plan = createPasteReviewPlan("GITHUB_TOKEN=ghp_dummyDummyDummyDummyDummyDummy123456", context);

    expect(plan).toMatchObject({
      type: "review",
      request: {
        mode: "paste_guard"
      }
    });
  });

  it("creates a context-check review plan for long sensitive-looking prompts", () => {
    const context = createContentGuardContext({
      settings: DEFAULT_SETTINGS,
      remoteRules: []
    });

    const plan = createPasteReviewPlan(
      "This confidential project summary includes enough text to trigger the context check review flow.",
      context
    );

    expect(plan).toMatchObject({
      type: "review",
      request: {
        mode: "context_check"
      }
    });
  });

  it("returns send review requests only when findings require review", () => {
    const context = createContentGuardContext({
      settings: DEFAULT_SETTINGS,
      remoteRules: []
    });

    expect(createSendReviewRequest("The weather is nice today.", context)).toBeNull();
    expect(createSendReviewRequest("予算は300万円です。", context)).not.toBeNull();
  });

  it("limits site adapters to ChatGPT, Claude, and Gemini", () => {
    expect(adapterForHostname("chatgpt.com")?.id).toBe("chatgpt");
    expect(adapterForHostname("chat.openai.com")?.id).toBe("chatgpt");
    expect(adapterForHostname("claude.ai")?.id).toBe("claude");
    expect(adapterForHostname("gemini.google.com")?.id).toBe("gemini");
    expect(adapterForHostname("example.com")).toBeNull();
  });
});
