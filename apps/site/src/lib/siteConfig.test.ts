import { describe, expect, it } from "vitest";
import { githubPagesConfig, sitePath } from "./siteConfig";

describe("githubPagesConfig", () => {
  it("公開URLとビルド設定をコードで共有する", () => {
    expect(githubPagesConfig).toEqual({
      repository: "shunya-mabuchi/ai-mae-check",
      productionBranch: "main",
      workflow: ".github/workflows/github-pages.yml",
      buildCommand: "pnpm build:pages",
      buildOutputDirectory: "apps/site/dist",
      nodeVersion: "22",
      pnpmVersion: "10.12.1",
      basePath: "/ai-mae-check",
      urls: {
        home: "https://shunya-mabuchi.github.io/ai-mae-check/",
        privacy: "https://shunya-mabuchi.github.io/ai-mae-check/privacy/",
        support: "https://shunya-mabuchi.github.io/ai-mae-check/support/",
        rules: "https://shunya-mabuchi.github.io/ai-mae-check/rules/latest.json"
      }
    });
  });

  it("内部リンクへbase pathを付与する", () => {
    expect(sitePath("/")).toBe("/ai-mae-check/");
    expect(sitePath("/#demo")).toBe("/ai-mae-check/#demo");
    expect(sitePath("/privacy/")).toBe("/ai-mae-check/privacy/");
  });
});
