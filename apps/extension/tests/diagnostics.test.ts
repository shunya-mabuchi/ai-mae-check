import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../src/lib/settings";
import { createPrivacySafeDiagnosticReport, formatPrivacySafeDiagnosticReport } from "../src/lib/diagnostics";

describe("privacy safe diagnostics", () => {
  it("本文や検出文字列を含まない診断情報を作る", async () => {
    const report = await createPrivacySafeDiagnosticReport({
      settings: DEFAULT_SETTINGS,
      now: new Date("2026-06-23T00:00:00.000Z"),
      runtime: {
        getManifest: () => ({
          name: "AIまえチェック",
          version: "0.1.1"
        })
      },
      navigatorLike: {
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.180 Safari/537.36",
        gpu: {
          requestAdapter: async () => ({})
        }
      }
    });
    const text = formatPrivacySafeDiagnosticReport(report);

    expect(report.product.extensionVersion).toBe("0.1.1");
    expect(report.environment.browser).toBe("Chrome 148.0.7778.180");
    expect(report.environment.os).toBe("Windows");
    expect(report.environment.webGpu.status).toBe("available");
    expect(report.privacy).toMatchObject({
      includesUserText: false,
      includesFindings: false,
      includesPlaceholderMap: false,
      includesPageUrl: false
    });
    expect(text).not.toContain("山田花子");
    expect(text).not.toContain("Project Blue Bridge");
    expect(text).not.toContain("taro@example.com");
  });

  it("WebGPUがない環境を本文なしで表現する", async () => {
    const report = await createPrivacySafeDiagnosticReport({
      settings: DEFAULT_SETTINGS,
      navigatorLike: {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/148.0.0.0 Safari/537.36"
      }
    });

    expect(report.environment.os).toBe("macOS");
    expect(report.environment.webGpu).toEqual({
      status: "unavailable",
      reason: "navigator.gpu is not available"
    });
  });

  it("無効化されたサイトとルールはIDと件数だけを含める", async () => {
    const report = await createPrivacySafeDiagnosticReport({
      settings: {
        ...DEFAULT_SETTINGS,
        sites: {
          ...DEFAULT_SETTINGS.sites,
          claude: false
        },
        rules: {
          ...DEFAULT_SETTINGS.rules,
          email: false,
          phone_jp: false
        }
      },
      navigatorLike: {
        userAgent: ""
      }
    });

    expect(report.settings.disabledSites).toEqual(["claude"]);
    expect(report.settings.disabledRuleCount).toBe(2);
    expect(formatPrivacySafeDiagnosticReport(report)).not.toContain("[EMAIL_1]");
    expect(formatPrivacySafeDiagnosticReport(report)).not.toContain("090-1234-5678");
  });
});
