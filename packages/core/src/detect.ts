import { detectorRules } from "./rules";
import { maskSensitiveText, normalizeFindings } from "./mask";
import type { DetectionResult, DetectionSummary, DetectOptions, Finding, RiskLevel } from "./types";

const riskOrder: Record<RiskLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

function shouldUseRule(ruleId: string, options: DetectOptions): boolean {
  if (options.enabledRuleIds && !options.enabledRuleIds.includes(ruleId)) {
    return false;
  }

  if (options.disabledRuleIds?.includes(ruleId)) {
    return false;
  }

  return true;
}

function shouldKeepRisk(riskLevel: RiskLevel, options: DetectOptions): boolean {
  if (riskLevel === "low" && options.includeLowRisk === false) {
    return false;
  }

  if (options.minRiskLevel) {
    return riskOrder[riskLevel] >= riskOrder[options.minRiskLevel];
  }

  return true;
}

function createSummary(findings: Finding[]): DetectionSummary {
  const summary: DetectionSummary = {
    total: findings.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    byRule: {}
  };

  for (const finding of findings) {
    summary[finding.riskLevel] += 1;
    summary.byRule[finding.ruleId] = (summary.byRule[finding.ruleId] ?? 0) + 1;
  }

  return summary;
}

function highestRiskLevel(findings: Finding[]): RiskLevel | null {
  if (findings.some((finding) => finding.riskLevel === "critical")) {
    return "critical";
  }

  if (findings.some((finding) => finding.riskLevel === "high")) {
    return "high";
  }

  if (findings.some((finding) => finding.riskLevel === "medium")) {
    return "medium";
  }

  if (findings.some((finding) => finding.riskLevel === "low")) {
    return "low";
  }

  return null;
}

export function detectSensitiveText(input: string, options: DetectOptions = {}): DetectionResult {
  if (input.length === 0) {
    return {
      findings: [],
      summary: createSummary([]),
      highestRiskLevel: null,
      maskedText: input,
      placeholderMap: []
    };
  }

  const activeRules = [...detectorRules, ...(options.extraRules ?? [])];
  const findings = activeRules.flatMap((rule) => {
    if (!rule.enabled || !shouldUseRule(rule.id, options) || !shouldKeepRisk(rule.riskLevel, options)) {
      return [];
    }

    return rule.createFindings(input);
  });

  const normalizedFindings = normalizeFindings(findings);
  const maskResult = maskSensitiveText(input, normalizedFindings);

  return {
    findings: maskResult.findings,
    summary: createSummary(maskResult.findings),
    highestRiskLevel: highestRiskLevel(maskResult.findings),
    maskedText: maskResult.maskedText,
    placeholderMap: maskResult.placeholderMap
  };
}
