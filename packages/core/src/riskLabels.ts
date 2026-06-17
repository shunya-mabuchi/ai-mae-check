import type { RiskDecisionLevel, RiskLevel } from "./types";

export const findingRiskLabels: Record<RiskLevel, string> = {
  critical: "重大",
  high: "高",
  medium: "中",
  low: "低"
};

export const decisionRiskLabels: Record<RiskDecisionLevel, string> = {
  safe: "安全寄り",
  low: findingRiskLabels.low,
  medium: findingRiskLabels.medium,
  high: findingRiskLabels.high,
  critical: findingRiskLabels.critical
};
