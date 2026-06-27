import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("web accessible resources", () => {
  it("Content Scriptモーダルで表示するブランドアイコンを公開リソースに含める", () => {
    const configSource = readFileSync(resolve(process.cwd(), "wxt.config.ts"), "utf8");
    const resourcesSection = configSource.slice(configSource.indexOf("web_accessible_resources"));

    expect(resourcesSection).toContain('"icon/16.png"');
    expect(resourcesSection).toContain('"icon/32.png"');
    expect(resourcesSection).toContain('"icon/48.png"');
    expect(resourcesSection).toContain('"icon/128.png"');
  });
});
