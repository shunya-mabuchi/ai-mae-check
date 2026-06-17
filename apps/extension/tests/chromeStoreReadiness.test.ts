import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = resolve(__dirname, "../../..");
const listingPath = resolve(rootDir, "docs/chrome-web-store-listing.json");
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
    expect(listing.supportUrl).toContain("github.com/shunya-mabuchi/ai-mae-check/issues");
    expect(listing.privacyPolicyUrl).toContain("privacy");
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

  it("Chrome Web Store提出前QAコマンドをroot scriptsに用意する", () => {
    const rootPackage = readJson<{ scripts: Record<string, string> }>(resolve(rootDir, "package.json"));

    expect(existsSync(qaScriptPath)).toBe(true);
    expect(rootPackage.scripts["qa:chrome-store"]).toBe("node scripts/check-chrome-store-readiness.mjs");
  });
});
