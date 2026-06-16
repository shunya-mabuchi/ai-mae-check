import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("content script UX", () => {
  it("右下の常時risk badgeを表示しない", () => {
    const contentScript = readFileSync(resolve(process.cwd(), "entrypoints/content.ts"), "utf8");

    expect(contentScript).not.toContain("riskBadge");
    expect(contentScript).not.toContain("mountRiskBadge");
  });
});
