import { describe, expect, it } from "vitest";
import { detectSensitiveText, scoreRisk, type Finding } from "../src";

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: "test:finding:0:1",
    ruleId: "test",
    source: "rule",
    label: "テスト候補",
    riskLevel: "medium",
    start: 0,
    end: 1,
    text: "x",
    placeholder: "[TEST_1]",
    message: "テスト用の候補です。",
    confidence: 1,
    ...overrides
  };
}

describe("scoreRisk", () => {
  it("検出がない場合はsafeでブロックしない", () => {
    const result = scoreRisk([]);

    expect(result).toEqual({
      score: 0,
      level: "safe",
      blocked: false,
      secretGuard: false,
      categoryCounts: {},
      reasons: []
    });
  });

  it("Secret Guard対象を検出するとblockedにする", () => {
    const detection = detectSensitiveText("GITHUB_TOKEN=ghp_dummyDummyDummyDummyDummyDummy123456");
    const result = scoreRisk(detection.findings);

    expect(result.secretGuard).toBe(true);
    expect(result.blocked).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.categoryCounts.secret).toBe(1);
    expect(result.reasons.some((reason) => reason.includes("Secret Guard"))).toBe(true);
  });

  it("スコアがhigh以上ならSecret Guard以外でもblockedにする", () => {
    const result = scoreRisk([
      finding({ id: "financial:1", ruleId: "llm:financial_info", category: "financial", label: "金融情報候補" }),
      finding({ id: "legal:1", ruleId: "llm:legal_info", category: "legal", label: "法務情報候補" }),
      finding({ id: "medical:1", ruleId: "llm:medical_info", category: "medical", label: "医療情報候補" })
    ]);

    expect(result.score).toBe(60);
    expect(result.level).toBe("high");
    expect(result.blocked).toBe(true);
    expect(result.secretGuard).toBe(false);
  });

  it("カテゴリの組み合わせ加点を反映する", () => {
    const result = scoreRisk([
      finding({ id: "person:1", category: "person", ruleId: "llm:person_name", label: "人名候補" }),
      finding({ id: "phone:1", category: "phone", ruleId: "phone", label: "電話番号" }),
      finding({ id: "date:1", category: "date", ruleId: "date", label: "日付" })
    ]);

    expect(result.score).toBe(20);
    expect(result.level).toBe("medium");
    expect(result.blocked).toBe(false);
    expect(result.categoryCounts).toMatchObject({
      person: 1,
      phone: 1,
      date: 1
    });
  });
});
