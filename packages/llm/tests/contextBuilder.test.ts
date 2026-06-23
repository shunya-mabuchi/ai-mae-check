import { describe, expect, it } from "vitest";
import type { Finding } from "@ai-mae-check/core";
import { buildContextCheckPlan, createContextCheckInput, evaluateContextHint } from "../src";

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: "rule:secret:1",
    ruleId: "env_secret",
    source: "rule",
    label: "秘密情報",
    riskLevel: "high",
    category: "secret",
    start: 32,
    end: 62,
    text: "API_KEY=dummy_dummy_dummy",
    placeholder: "[ENV_SECRET_1]",
    message: "外部へ送る前に確認したい情報です。",
    confidence: 1,
    ...overrides
  };
}

describe("ContextBuilder", () => {
  it("文脈チェックを提案する理由をスコア化する", () => {
    const result = evaluateContextHint(
      "A社向けの提案メモです。NDA締結前なので関係者限りで確認します。候補者の山田花子さんの評価メモも含みます。"
    );

    expect(result.shouldOffer).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(4);
    expect(result.reasons).toContain("near_confidential_hint");
    expect(result.reasons).toContain("near_person_like");
  });

  it("短い日常文では文脈チェックを提案しない", () => {
    expect(evaluateContextHint("今日は天気がよいので、あとでメモを整理します。")).toEqual({
      shouldOffer: false,
      score: 0,
      reasons: []
    });
  });

  it("既存のルール検出結果をヒントとして扱う", () => {
    const result = evaluateContextHint("連絡先とAPIキーの控えを貼り付けます。社内確認用です。", {
      existingFindings: [finding({ start: 4, end: 10 })]
    });

    expect(result.shouldOffer).toBe(true);
    expect(result.reasons).toContain("near_secret");
  });

  it("検出箇所の周辺だけを短いwindowに切り出す", () => {
    const input = [
      "これは前置きです。".repeat(40),
      "A社向けの提案メモです。NDA締結前なので関係者限りで確認してください。",
      "これは末尾の一般説明です。".repeat(40)
    ].join("\n");
    const plan = buildContextCheckPlan(input, { maxInputChars: 220, windowChars: 120 });
    const inputForModel = createContextCheckInput(plan);

    expect(plan.windows.length).toBeGreaterThan(0);
    expect(inputForModel).toContain("A社向けの提案メモ");
    expect(inputForModel.length).toBeLessThanOrEqual(220);
    expect(inputForModel).not.toContain("末尾の一般説明です。".repeat(10));
  });

  it("ヒントがない場合でも全文ではなく先頭windowだけに制限する", () => {
    const input = "公開済みの一般説明です。".repeat(200);
    const plan = buildContextCheckPlan(input, { maxInputChars: 500, windowChars: 160 });
    const inputForModel = createContextCheckInput(plan);

    expect(plan.windows).toHaveLength(1);
    expect(inputForModel.length).toBeLessThanOrEqual(160);
  });
});
