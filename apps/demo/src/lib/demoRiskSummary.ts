import type { DetectionSummary, Finding, RiskLevel } from "@ai-mae-check/core";

export interface RiskSummaryCategory {
  label: string;
  count: number;
}

export interface RiskSummaryStatus {
  label: string;
  text: string;
}

export interface RiskSummaryViewModel {
  meterRisk: RiskLevel;
  meterWidth: number;
  status: RiskSummaryStatus;
  categories: RiskSummaryCategory[];
}

function riskPercent(summary: DetectionSummary): number {
  const score = summary.critical * 42 + summary.high * 34 + summary.medium * 18 + summary.low * 8;
  return Math.min(100, score);
}

function strongestRisk(summary: DetectionSummary): RiskLevel {
  if (summary.critical > 0) {
    return "critical";
  }
  if (summary.high > 0) {
    return "high";
  }
  if (summary.medium > 0) {
    return "medium";
  }
  return "low";
}

function statusCopy(summary: DetectionSummary): RiskSummaryStatus {
  if (summary.critical > 0 || summary.high > 0) {
    return {
      label: "要マスク",
      text: "秘密情報や個人情報の可能性があります。送る前に対象を確認してください。"
    };
  }
  if (summary.medium > 0) {
    return {
      label: "確認推奨",
      text: "文脈によって注意が必要な情報があります。必要なものだけ残せます。"
    };
  }
  return {
    label: "未検出",
    text: "検出を実行すると、リスクとカテゴリがここに表示されます。"
  };
}

function categoryCounts(findings: Finding[]): RiskSummaryCategory[] {
  const counts = new Map<string, number>();
  for (const finding of findings) {
    counts.set(finding.label, (counts.get(finding.label) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

export function createRiskSummaryViewModel(summary: DetectionSummary, findings: Finding[]): RiskSummaryViewModel {
  return {
    meterRisk: strongestRisk(summary),
    meterWidth: riskPercent(summary),
    status: statusCopy(summary),
    categories: categoryCounts(findings)
  };
}
