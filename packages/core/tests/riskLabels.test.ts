import { describe, expect, it } from "vitest";
import { decisionRiskLabels, findingRiskLabels } from "../src";

describe("risk labels", () => {
  it("検出項目の危険度ラベルを全RiskLevel分返す", () => {
    expect(findingRiskLabels).toEqual({
      critical: "重大",
      high: "高",
      medium: "中",
      low: "低"
    });
  });

  it("判定ラベルをsafeを含む全RiskDecisionLevel分返す", () => {
    expect(decisionRiskLabels).toEqual({
      safe: "安全寄り",
      low: "低",
      medium: "中",
      high: "高",
      critical: "重大"
    });
  });
});
