import {
  evaluateDlpPolicy,
  findingRiskLabels,
  type DetectionSummary,
  type Finding,
  type PolicyDecision,
  type RiskLevel
} from "@ai-mae-check/core";

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
  policy: PolicyDecision;
}

export interface RiskCountTile {
  key: "high" | "medium" | "low";
  label: string;
  count: number;
  containerClassName: string;
  labelClassName: string;
  countClassName: string;
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

function statusCopy(summary: DetectionSummary, policy: PolicyDecision): RiskSummaryStatus {
  if (summary.total === 0) {
    return {
      label: "未検出",
      text: "検出を実行すると、リスクとカテゴリがここに表示されます。"
    };
  }
  if (policy.requiresSanitization) {
    return {
      label: "要安全化",
      text: "秘密情報や個人情報の可能性があります。送る前に対象を確認してください。"
    };
  }
  if (policy.action === "confirm") {
    return {
      label: "確認推奨",
      text: "文脈によって注意が必要な情報があります。必要なものだけ残せます。"
    };
  }
  return {
    label: "低リスク",
    text: "大きな注意候補は見つかっていませんが、安全を保証するものではありません。"
  };
}

function categoryCounts(findings: Finding[]): RiskSummaryCategory[] {
  const counts = new Map<string, number>();
  for (const finding of findings) {
    counts.set(finding.label, (counts.get(finding.label) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

export function createRiskCountTiles(summary: DetectionSummary): RiskCountTile[] {
  return [
    {
      key: "high",
      label: findingRiskLabels.high,
      count: summary.high + summary.critical,
      containerClassName: "rounded-card bg-rose-50 p-3",
      labelClassName: "text-xs font-black text-rose-700",
      countClassName: "text-2xl font-black text-rose-800"
    },
    {
      key: "medium",
      label: findingRiskLabels.medium,
      count: summary.medium,
      containerClassName: "rounded-card bg-amber-50 p-3",
      labelClassName: "text-xs font-black text-amber-800",
      countClassName: "text-2xl font-black text-amber-900"
    },
    {
      key: "low",
      label: findingRiskLabels.low,
      count: summary.low,
      containerClassName: "rounded-card bg-sky-50 p-3",
      labelClassName: "text-xs font-black text-sky-800",
      countClassName: "text-2xl font-black text-sky-900"
    }
  ];
}

export function createRiskSummaryViewModel(summary: DetectionSummary, findings: Finding[]): RiskSummaryViewModel {
  const policy = evaluateDlpPolicy(findings);

  return {
    meterRisk: strongestRisk(summary),
    meterWidth: riskPercent(summary),
    status: statusCopy(summary, policy),
    categories: categoryCounts(findings),
    policy
  };
}
