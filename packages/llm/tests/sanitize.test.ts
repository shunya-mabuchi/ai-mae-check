import { describe, expect, it } from "vitest";
import {
  buildSanitizePrompt,
  createSanitizeAnalysisResult,
  parseSanitizeAnalysisJson
} from "../src";

describe("buildSanitizePrompt", () => {
  it("safe_promptを含むStrict JSON指示を生成する", () => {
    const messages = buildSanitizePrompt("A社向けの提案資料です。");
    const joined = messages.map((message) => message.content).join("\n");

    expect(joined).toContain("safe_prompt");
    expect(joined).toContain("必ずJSONだけを返す");
    expect(joined).toContain("A社向けの提案資料です。");
  });

  it("用途別に外部AIへ貼るための自然な依頼文へ整える指示を含める", () => {
    const messages = buildSanitizePrompt(
      "A社向けにProject Blue Bridgeの契約更新案と候補者の給与条件を整理してください。"
    );
    const joined = messages.map((message) => message.content).join("\n");

    expect(joined).toContain("外部AIへ貼るための自然な依頼文");
    expect(joined).toContain("顧客提案");
    expect(joined).toContain("顧客名");
    expect(joined).toContain("契約前情報");
    expect(joined).toContain("採用/人事");
    expect(joined).toContain("候補者名");
    expect(joined).toContain("給与条件");
    expect(joined).toContain("法務/契約");
    expect(joined).toContain("契約条件");
    expect(joined).toContain("社内情報");
    expect(joined).toContain("社内URL");
    expect(joined).toContain("内部プロジェクト名");
    expect(joined).toContain("削った/抽象化したカテゴリ");
    expect(joined).toContain("再スキャン");
  });
});

describe("parseSanitizeAnalysisJson", () => {
  it("safe_prompt JSONを正規化して読み取る", () => {
    const parsed = parseSanitizeAnalysisJson(
      JSON.stringify({
        block: false,
        risk_level: "medium",
        detected_categories: [
          {
            type: "organization",
            risk: "medium",
            action: "generalize"
          }
        ],
        safe_prompt: "顧客向けの提案資料です。",
        user_visible_explanation: "顧客名を汎用表現にしました。"
      })
    );

    expect(parsed.safePrompt).toBe("顧客向けの提案資料です。");
    expect(parsed.detectedCategories[0]?.action).toBe("generalize");
  });

  it("不正JSON時のエラーに本文を含めない", () => {
    const rawText = "JSONではありません。taro@example.com";

    expect(() => parseSanitizeAnalysisJson(rawText)).toThrow("AI安全化結果を読み取れませんでした");
    try {
      parseSanitizeAnalysisJson(rawText);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain("taro@example.com");
    }
  });
});

describe("createSanitizeAnalysisResult", () => {
  it("safePromptをルールベースで再スキャンし、Secret Guardが残ればblockにする", () => {
    const result = createSanitizeAnalysisResult(
      JSON.stringify({
        block: false,
        risk_level: "low",
        detected_categories: [],
        safe_prompt: "GITHUB_TOKEN=ghp_dummyDummyDummyDummyDummyDummy123456",
        user_visible_explanation: "安全化しました。"
      }),
      "test-model",
      12
    );

    expect(result.block).toBe(true);
    expect(result.residualPolicy.requiresSanitization).toBe(true);
    expect(result.residualFindings.length).toBeGreaterThan(0);
  });
});
