import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = resolve(__dirname, "../../..");
const listingPath = resolve(rootDir, "docs/chrome-web-store-listing.json");
const assetManifestPath = resolve(rootDir, "docs/chrome-web-store-assets.json");
const submissionCopyPath = resolve(rootDir, "docs/chrome-web-store-submission-copy.md");
const qaScriptPath = resolve(rootDir, "scripts/check-chrome-store-readiness.mjs");
const releaseConfigPath = resolve(rootDir, "apps/extension/config/rule-delivery.release.json");

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

describe("Chrome Web Store readiness", () => {
  it("keeps the Developer Dashboard listing source in JSON", () => {
    expect(existsSync(listingPath)).toBe(true);

    const listing = readJson<{
      name: string;
      shortDescription: string;
      detailedDescription: string;
      category: string;
      language: string;
      supportUrl: string;
      privacyPolicyUrl: string;
      singlePurpose: string;
      permissionJustifications: Record<string, string>;
      remoteCode: { usesRemoteCode: boolean; explanation: string };
      dataUsage: {
        collectsUserData: boolean;
        collectedDataTypes: string[];
        notCollectedDataTypes: string[];
        explanation: string;
      };
      testInstructions: string[];
    }>(listingPath);

    expect(listing.name).toBe("AIまえチェック");
    expect(listing.shortDescription.length).toBeLessThanOrEqual(132);
    expect(listing.category).toBe("ツール");
    expect(listing.language).toBe("日本語");
    expect(listing.supportUrl).toBe("https://ai-mae-check.pages.dev/support");
    expect(listing.privacyPolicyUrl).toBe("https://ai-mae-check.pages.dev/privacy");
    expect(listing.singlePurpose).toContain("AIまえチェック");
    expect(listing.permissionJustifications.storage).toContain("設定");
    expect(listing.permissionJustifications.host_permissions).toContain("ChatGPT");
    expect(listing.permissionJustifications.host_permissions).toContain("<all_urls> は要求していません");
    expect(listing.remoteCode.usesRemoteCode).toBe(false);
    expect(listing.remoteCode.explanation).toContain("外部から任意のコードを取得して実行しません");
    expect(listing.remoteCode.explanation).toContain("外部LLM APIへ送信するものではありません");
    expect(listing.dataUsage.collectsUserData).toBe(true);
    expect(listing.dataUsage.collectedDataTypes).toContain("ウェブサイトのコンテンツ");
    expect(listing.dataUsage.notCollectedDataTypes).toContain("ウェブ履歴");
    expect(listing.dataUsage.explanation).toContain("販売・第三者提供");
    expect(listing.dataUsage.explanation).toContain("chrome.storage.local");
    expect(listing.testInstructions).toHaveLength(6);
  });

  it("avoids overclaim copy in the store listing", () => {
    const listingText = readFileSync(listingPath, "utf8");

    expect(listingText).not.toContain("絶対安全");
    expect(listingText).not.toContain("100%");
    expect(listingText).not.toContain("すべての情報漏洩を防ぎます");
    expect(listingText).not.toContain("完全に通信しません");
  });

  it("keeps the store asset manifest in JSON", () => {
    expect(existsSync(assetManifestPath)).toBe(true);

    const assetManifest = readJson<{
      screenshots: Array<{
        order: number;
        path: string;
        purpose: string;
        primarySurface: "extension" | "demo" | "landing";
        sourceImage?: string;
        sourceKind?: "real_extension_capture" | "generated";
      }>;
      promotionalImages: Array<{ type: string; path: string; width: number; height: number }>;
    }>(assetManifestPath);

    expect(assetManifest.screenshots).toHaveLength(3);
    expect(assetManifest.screenshots.map((screenshot) => screenshot.order)).toEqual([1, 2, 3]);
    expect(assetManifest.screenshots[0]?.primarySurface).toBe("extension");
    expect(assetManifest.screenshots[0]?.path).toContain("screenshot-01-real-paste-modal.png");
    expect(assetManifest.screenshots[1]?.path).toContain("screenshot-02-real-send-modal.png");
    expect(assetManifest.screenshots[2]?.path).toContain("screenshot-03-real-context-modal.png");
    expect(assetManifest.screenshots.slice(0, 3).every((screenshot) => screenshot.sourceKind === "real_extension_capture")).toBe(
      true
    );
    expect(assetManifest.screenshots[0]?.sourceImage).toContain("docs/assets/readme/extension-paste-modal.png");
    expect(assetManifest.screenshots[1]?.sourceImage).toContain("docs/assets/readme/extension-send-modal.png");
    expect(assetManifest.screenshots[2]?.sourceImage).toContain("docs/assets/readme/extension-context-modal.png");
    expect(assetManifest.promotionalImages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "small", width: 440, height: 280 }),
        expect.objectContaining({ type: "marquee", width: 1400, height: 560 })
      ])
    );
  });

  it("wires the QA and packaging scripts from the root package", () => {
    const rootPackage = readJson<{ scripts: Record<string, string> }>(resolve(rootDir, "package.json"));

    expect(existsSync(qaScriptPath)).toBe(true);
    expect(existsSync(releaseConfigPath)).toBe(true);
    expect(rootPackage.scripts["qa:chrome-store"]).toBe("node scripts/check-chrome-store-readiness.mjs");
    expect(rootPackage.scripts["package:extension"]).toBe("node scripts/package-extension-release.mjs");
  });

  it("keeps the submission copy aligned with the listing", () => {
    expect(existsSync(submissionCopyPath)).toBe(true);

    const listing = readJson<{
      name: string;
      shortDescription: string;
      supportUrl: string;
      privacyPolicyUrl: string;
      permissionJustifications: Record<string, string>;
    }>(listingPath);
    const copy = readFileSync(submissionCopyPath, "utf8");

    expect(copy).toContain("# Chrome Web Store 掲載文 最終版");
    expect(copy).toContain(listing.name);
    expect(copy).toContain(listing.shortDescription);
    expect(copy).toContain(listing.supportUrl);
    expect(copy).toContain(listing.privacyPolicyUrl);
    expect(copy).toContain(listing.permissionJustifications.storage);
    expect(copy).toContain(listing.permissionJustifications.host_permissions);
    expect(copy).toContain("外部から任意のコードを取得して実行しません");
    expect(copy).toContain("ユーザー本文を外部LLM APIへ送信するものではありません");
    expect(copy).toContain("販売・第三者提供");
    expect(copy).toContain("chrome.storage.local");
    expect(copy).toContain("screenshot-01-real-paste-modal.png");
    expect(copy).toContain("screenshot-02-real-send-modal.png");
    expect(copy).toContain("screenshot-03-real-context-modal.png");
  });
});
