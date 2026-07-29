import { describe, expect, it } from "vitest";
import { githubPagesConfig, resolveSiteRoute, sitePath } from "./siteRoutes";

describe("resolveSiteRoute", () => {
  it("GitHub Pagesのbase pathを除いて公開ページを判定する", () => {
    expect(resolveSiteRoute("/ai-mae-check/")).toBe("home");
    expect(resolveSiteRoute("/ai-mae-check/privacy/")).toBe("privacy");
    expect(resolveSiteRoute("/ai-mae-check/support/")).toBe("support");
  });

  it("ローカル開発時のルート直下も判定する", () => {
    expect(resolveSiteRoute("/")).toBe("home");
    expect(resolveSiteRoute("/privacy")).toBe("privacy");
    expect(resolveSiteRoute("/support")).toBe("support");
  });
});

describe("githubPagesConfig", () => {
  it("公開URLとビルド設定をコードで共有する", () => {
    expect(githubPagesConfig).toEqual({
      repository: "shunya-mabuchi/ai-mae-check",
      productionBranch: "main",
      workflow: ".github/workflows/github-pages.yml",
      buildCommand: "pnpm build:pages",
      buildOutputDirectory: "apps/demo/dist",
      nodeVersion: "22",
      pnpmVersion: "10.12.1",
      basePath: "/ai-mae-check",
      urls: {
        home: "https://shunya-mabuchi.github.io/ai-mae-check/",
        privacy: "https://shunya-mabuchi.github.io/ai-mae-check/privacy/",
        support: "https://shunya-mabuchi.github.io/ai-mae-check/support/",
        rules: "https://shunya-mabuchi.github.io/ai-mae-check/api/rules/latest.json"
      }
    });
  });

  it("内部リンクへbase pathを付与する", () => {
    expect(sitePath("/")).toBe("/ai-mae-check/");
    expect(sitePath("/#demo")).toBe("/ai-mae-check/#demo");
    expect(sitePath("/privacy/")).toBe("/ai-mae-check/privacy/");
  });
});
