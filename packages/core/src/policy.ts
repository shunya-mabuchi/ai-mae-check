import { categoryForFinding, scoreRisk } from "./riskScore";
import type { DlpPolicySeverity, Finding, PolicyDecision, RiskDecisionLevel } from "./types";

const severityRank: Record<DlpPolicySeverity, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

function severityFromRiskLevel(level: RiskDecisionLevel): DlpPolicySeverity {
  return level === "safe" ? "none" : level;
}

function strongestSeverity(findings: Finding[], riskLevel: RiskDecisionLevel): DlpPolicySeverity {
  let severity = severityFromRiskLevel(riskLevel);

  for (const finding of findings) {
    if (severityRank[finding.riskLevel] > severityRank[severity]) {
      severity = finding.riskLevel;
    }
  }

  return severity;
}

function isRequiredForSanitization(finding: Finding): boolean {
  return finding.riskLevel === "critical" || finding.riskLevel === "high" || categoryForFinding(finding) === "secret";
}

function splitFindingIds(findings: Finding[], requiresSanitization: boolean): Pick<PolicyDecision, "requiredFindingIds" | "optionalFindingIds"> {
  if (!requiresSanitization) {
    return {
      requiredFindingIds: [],
      optionalFindingIds: findings.map((finding) => finding.id)
    };
  }

  const required = findings.filter(isRequiredForSanitization);
  const requiredFindingIds = (required.length > 0 ? required : findings).map((finding) => finding.id);
  const requiredIds = new Set(requiredFindingIds);

  return {
    requiredFindingIds,
    optionalFindingIds: findings.filter((finding) => !requiredIds.has(finding.id)).map((finding) => finding.id)
  };
}

export function evaluateDlpPolicy(findings: Finding[]): PolicyDecision {
  const risk = scoreRisk(findings);
  const severity = strongestSeverity(findings, risk.level);
  const hasRequiredFindings = findings.some(isRequiredForSanitization);
  const requiresSanitization = risk.blocked || hasRequiredFindings;

  if (requiresSanitization) {
    const reason = "高リスクまたは秘密情報保護の対象が含まれるため、安全化が必要です。";
    return {
      action: "sanitize_required",
      severity,
      reason,
      ...splitFindingIds(findings, true),
      canSendRaw: false,
      requiresSanitization: true,
      risk,
      message: reason
    };
  }

  if (risk.level === "medium") {
    const reason = "送信前に詳細確認が必要な候補があります。";
    return {
      action: "confirm",
      severity,
      reason,
      ...splitFindingIds(findings, false),
      canSendRaw: true,
      requiresSanitization: false,
      risk,
      message: reason
    };
  }

  const reason = "そのまま送信できる範囲の判定です。";
  return {
    action: "allow",
    severity,
    reason,
    ...splitFindingIds(findings, false),
    canSendRaw: true,
    requiresSanitization: false,
    risk,
    message: reason
  };
}
