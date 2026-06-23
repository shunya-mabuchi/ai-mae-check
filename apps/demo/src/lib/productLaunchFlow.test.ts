import { describe, expect, it } from "vitest";
import { createProductLaunchFlow } from "./productLaunchFlow";

describe("createProductLaunchFlow", () => {
  it("公開後はChrome Web Storeへの導線を最優先にする", () => {
    const flow = createProductLaunchFlow();

    expect(flow.status.label).toBe("Chrome Web Store公開中");
    expect(flow.status.description).toContain("Chrome Web Storeから追加できます");
    expect(flow.status.description).toContain("GitHubからのローカル読み込み手順");
    expect(flow.primaryCta).toEqual({
      label: "Chrome Web Storeで追加",
      href: "https://chrome.google.com/webstore/detail/idedmkfplfieijdcflcogkngplhkkecc",
      kind: "primary"
    });
    expect(flow.demoCta).toEqual({
      label: "ミニデモで先に試す",
      href: "#demo",
      kind: "ghost"
    });
    expect(flow.githubCta.href).toBe("https://github.com/shunya-mabuchi/ai-mae-check");
  });

  it("公開後の確認順序はストア追加を起点にする", () => {
    const flow = createProductLaunchFlow();

    expect(flow.installSteps.map((step) => step.title)).toEqual([
      "Chrome Web Storeから追加する",
      "必要ならGitHubで実装を見る",
      "ChatGPT / Claude / Geminiで試す"
    ]);
    const storeInstallStep = flow.installSteps[0];
    if (!storeInstallStep) {
      throw new Error("store install step not found");
    }
    expect(storeInstallStep.body).toContain("Chrome Web Store");
    expect(flow.demoRole).toContain("ミニデモは補助体験");
    expect(flow.demoRole).toContain("本体はChrome拡張");
  });
});
