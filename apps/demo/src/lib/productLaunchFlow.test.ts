import { describe, expect, it } from "vitest";
import { createProductLaunchFlow } from "./productLaunchFlow";

describe("createProductLaunchFlow", () => {
  it("公開前はChrome拡張本体への導線を最優先にする", () => {
    const flow = createProductLaunchFlow();

    expect(flow.status.label).toBe("Chrome Web Store審査中");
    expect(flow.status.description).toContain("現在はGitHubからローカル読み込みで確認できます");
    expect(flow.status.description).toContain("Chrome Web Store追加リンクへ差し替えます");
    expect(flow.primaryCta).toEqual({
      label: "拡張機能の導入手順を見る",
      href: "#install",
      kind: "primary"
    });
    expect(flow.postApprovalCta).toEqual({
      label: "Chrome Web Storeで追加",
      href: "https://chromewebstore.google.com/detail/idedmkfplfieijdcflcogkngplhkkecc",
      kind: "primary"
    });
    expect(flow.demoCta).toEqual({
      label: "ミニデモで先に試す",
      href: "#demo",
      kind: "ghost"
    });
    expect(flow.githubCta.href).toBe("https://github.com/shunya-mabuchi/ai-mae-check");
  });

  it("公開前の確認順序はストア未公開でも迷わない3ステップにする", () => {
    const flow = createProductLaunchFlow();

    expect(flow.installSteps.map((step) => step.title)).toEqual([
      "GitHubでコードを見る",
      "ローカルで拡張を読み込む",
      "ChatGPT / Claude / Geminiで試す"
    ]);
    const localInstallStep = flow.installSteps[1];
    if (!localInstallStep) {
      throw new Error("local install step not found");
    }
    expect(localInstallStep.body).toContain("apps/extension/.output/chrome-mv3");
    expect(flow.demoRole).toContain("ミニデモは補助体験");
    expect(flow.demoRole).toContain("本体はChrome拡張");
  });
});
