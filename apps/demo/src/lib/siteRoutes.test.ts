import { describe, expect, it } from "vitest";
import { cloudflarePagesConfig, resolveSiteRoute } from "./siteRoutes";

describe("site routes", () => {
  it("Cloudflare Pagesで直接開く公開ページを判定できる", () => {
    expect(resolveSiteRoute("/")).toBe("home");
    expect(resolveSiteRoute("/privacy")).toBe("privacy");
    expect(resolveSiteRoute("/privacy/")).toBe("privacy");
    expect(resolveSiteRoute("/support")).toBe("support");
    expect(resolveSiteRoute("/support/")).toBe("support");
  });

  it("未知のパスはLPへ戻してSPAとして壊さない", () => {
    expect(resolveSiteRoute("/unknown")).toBe("home");
    expect(resolveSiteRoute("/demo")).toBe("home");
  });
});

describe("cloudflarePagesConfig", () => {
  it("Cloudflare Pagesの設定値をドキュメントとコードで共有できる", () => {
    expect(cloudflarePagesConfig).toEqual({
      projectName: "ai-mae-check",
      productionBranch: "main",
      rootDirectory: ".",
      buildCommand: "pnpm build:demo",
      buildOutputDirectory: "apps/demo/dist",
      nodeVersion: "22",
      pnpmVersion: "10.12.1",
      spaFallback: "cloudflare-pages-default",
      urls: {
        home: "https://ai-mae-check.pages.dev/",
        privacy: "https://ai-mae-check.pages.dev/privacy",
        support: "https://ai-mae-check.pages.dev/support"
      }
    });
  });
});
