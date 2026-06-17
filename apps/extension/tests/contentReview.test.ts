import { describe, expect, it } from "vitest";
import type { DetectorRule } from "@ai-mae-check/core";
import { DEFAULT_SETTINGS } from "../src/lib/settings";
import {
  createContentDetection,
  isContentSiteEnabled,
  pasteReviewModeForAction
} from "../src/content/contentReview";

describe("contentReview", () => {
  it("設定の無効ルールとリモートルールを反映して検出する", () => {
    const remoteRule: DetectorRule = {
      id: "dummy_project",
      label: "ダミープロジェクト",
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
            label: "ダミープロジェクト",
            riskLevel: "medium",
            start,
            end: start + "Project Secret".length,
            text: "Project Secret",
            placeholder: "[PROJECT_1]",
            message: "テスト用の追加ルールです。",
            confidence: 0.9
          }
        ];
      }
    };

    const detection = createContentDetection("taro@example.com と Project Secret", {
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

  it("拡張設定と対象サイト設定から有効状態を判定する", () => {
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

  it("paste guard actionからモーダルmodeを決める", () => {
    expect(pasteReviewModeForAction("sanitize_required")).toBe("paste_guard");
    expect(pasteReviewModeForAction("confirm")).toBe("default");
  });
});
