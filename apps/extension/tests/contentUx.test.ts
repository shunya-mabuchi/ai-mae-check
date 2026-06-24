import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("content script UX", () => {
  it("右下の常時risk badgeを表示しない", () => {
    const contentScript = readFileSync(resolve(process.cwd(), "entrypoints/content.ts"), "utf8");

    expect(contentScript).not.toContain("riskBadge");
    expect(contentScript).not.toContain("mountRiskBadge");
    expect(contentScript).not.toContain("position: fixed");
    expect(contentScript).not.toContain("bottom:");
  });

  it("拡張アイコンは常時ステータス表示ではなく設定画面への導線にする", () => {
    const backgroundScript = readFileSync(resolve(process.cwd(), "entrypoints/background.ts"), "utf8");
    const configSource = readFileSync(resolve(process.cwd(), "wxt.config.ts"), "utf8");

    expect(backgroundScript).toContain('details.reason === "install"');
    expect(backgroundScript).toContain("chrome.action.onClicked.addListener");
    expect(backgroundScript).toContain("chrome.runtime.openOptionsPage");
    expect(configSource).toContain('default_title: "AIまえチェック"');
    expect(configSource).not.toContain("default_popup");
  });
});
