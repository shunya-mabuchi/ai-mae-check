import { describe, expect, it } from "vitest";
import type { DetectionSummary, Finding } from "@ai-mae-check/core";
import { createRiskSummaryViewModel } from "./demoRiskSummary";

const baseSummary: DetectionSummary = {
  total: 0,
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
  byRule: {}
};

function finding(id: string, label: string): Finding {
  return {
    id,
    ruleId: id,
    source: "rule",
    label,
    riskLevel: "medium",
    start: 0,
    end: 1,
    text: "x",
    placeholder: "[X_1]",
    message: "テスト用の検出です。",
    confidence: 1
  };
}

describe("demoRiskSummary", () => {
  it("重大・高リスクがあると要マスク表示と高いメーター値を返す", () => {
    const viewModel = createRiskSummaryViewModel(
      { ...baseSummary, total: 3, critical: 1, high: 1, medium: 1 },
      [finding("email", "メールアドレス")]
    );

    expect(viewModel.meterRisk).toBe("critical");
    expect(viewModel.meterWidth).toBe(94);
    expect(viewModel.status.label).toBe("要マスク");
  });

  it("中リスクのみなら確認推奨として扱う", () => {
    const viewModel = createRiskSummaryViewModel({ ...baseSummary, total: 2, medium: 2 }, []);

    expect(viewModel.meterRisk).toBe("medium");
    expect(viewModel.meterWidth).toBe(36);
    expect(viewModel.status.label).toBe("確認推奨");
  });

  it("検出カテゴリをラベルごとに集計する", () => {
    const viewModel = createRiskSummaryViewModel(
      { ...baseSummary, total: 3, high: 3 },
      [finding("email_1", "メールアドレス"), finding("email_2", "メールアドレス"), finding("phone", "日本の電話番号")]
    );

    expect(viewModel.categories).toEqual([
      { label: "メールアドレス", count: 2 },
      { label: "日本の電話番号", count: 1 }
    ]);
  });
});
