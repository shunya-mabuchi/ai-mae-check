import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = resolve(__dirname, "../../..");
const listingPath = resolve(rootDir, "docs/chrome-web-store-listing.json");
const assetManifestPath = resolve(rootDir, "docs/chrome-web-store-assets.json");
const submissionCopyPath = resolve(rootDir, "docs/chrome-web-store-submission-copy.md");
const qaScriptPath = resolve(rootDir, "scripts/check-chrome-store-readiness.mjs");

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

describe("Chrome Web Store readiness", () => {
  it("Developer Dashboardに入力する掲載情報をJSONで管理する", () => {
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
      dataUsage: { collectsUserData: boolean; explanation: string };
      testInstructions: string[];
    }>(listingPath);

    expect(listing.name).toBe("AIまえチェック");
    expect(listing.shortDescription.length).toBeLessThanOrEqual(132);
    expect(listing.category).toBe("仕事効率化");
    expect(listing.language).toBe("日本語");
    expect(listing.supportUrl).toBe("https://ai-mae-check.pages.dev/support");
    expect(listing.privacyPolicyUrl).toBe("https://ai-mae-check.pages.dev/privacy");
    expect(listing.singlePurpose).toContain("AIに文章を送る前");
    expect(listing.permissionJustifications.storage).toContain("設定");
    expect(listing.permissionJustifications.host_permissions).toContain("ChatGPT");
    expect(listing.remoteCode.usesRemoteCode).toBe(false);
    expect(listing.remoteCode.explanation).toContain("任意コード");
    expect(listing.dataUsage.collectsUserData).toBe(false);
    expect(listing.dataUsage.explanation).toContain("本文");
    expect(listing.testInstructions).toHaveLength(6);
  });

  it("ストア掲載文は誇大表現を避ける", () => {
    const listingText = readFileSync(listingPath, "utf8");

    expect(listingText).not.toContain("完全に安全");
    expect(listingText).not.toContain("100%");
    expect(listingText).not.toContain("すべての情報漏洩を防ぎます");
  });

  it("ストア掲載素材の最終アップロード順をJSONで管理する", () => {
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
    expect(assetManifest.screenshots[1]?.primarySurface).toBe("extension");
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

  it("Chrome Web Store提出前QAコマンドをroot scriptsに用意する", () => {
    const rootPackage = readJson<{ scripts: Record<string, string> }>(resolve(rootDir, "package.json"));

    expect(existsSync(qaScriptPath)).toBe(true);
    expect(rootPackage.scripts["qa:chrome-store"]).toBe("node scripts/check-chrome-store-readiness.mjs");
  });

  it("Developer Dashboardに貼り付ける最終掲載文をMarkdownで管理する", () => {
    expect(existsSync(submissionCopyPath)).toBe(true);

    const listing = readJson<{
      name: string;
      shortDescription: string;
      supportUrl: string;
      privacyPolicyUrl: string;
      permissionJustifications: Record<string, string>;
      remoteCode: { explanation: string };
      dataUsage: { explanation: string };
    }>(listingPath);
    const copy = readFileSync(submissionCopyPath, "utf8");

    expect(copy).toContain("# Chrome Web Store 掲載文 最終版");
    expect(copy).toContain(listing.name);
    expect(copy).toContain(listing.shortDescription);
    expect(copy).toContain(listing.supportUrl);
    expect(copy).toContain(listing.privacyPolicyUrl);
    expect(copy).toContain(listing.permissionJustifications.storage);
    expect(copy).toContain(listing.permissionJustifications.host_permissions);
    expect(copy).toContain(listing.remoteCode.explanation);
    expect(copy).toContain(listing.dataUsage.explanation);
    expect(copy).toContain("screenshot-01-real-paste-modal.png");
    expect(copy).toContain("screenshot-02-real-send-modal.png");
    expect(copy).toContain("screenshot-03-real-context-modal.png");
  });
});
