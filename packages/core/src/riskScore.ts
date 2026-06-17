import type { DlpCategory, Finding, RiskDecisionLevel, RiskScoreOptions, RiskScoreResult } from "./types";

const scoreByCategory: Record<DlpCategory, number> = {
  person: 0,
  organization: 5,
  address: 0,
  email: 10,
  phone: 0,
  id: 10,
  secret: 30,
  financial: 20,
  medical: 20,
  legal: 20,
  date: 5,
  url: 0,
  file: 10,
  other: 0
};

const categoryByRuleId: Record<string, DlpCategory> = {
  email: "email",
  phone: "phone",
  jwt: "secret",
  aws_access_key: "secret",
  github_token: "secret",
  private_key: "secret",
  env_secret: "secret",
  basic_auth_url: "secret",
  credit_card: "financial",
  url: "url",
  ip_address: "id",
  amount: "financial",
  confidential_text: "other",
  internal_url: "url",
  date: "date",
  postal_code: "address",
  long_id: "id",
  "llm:person_name": "person",
  "llm:company_name": "organization",
  "llm:customer_name": "organization",
  "llm:project_name": "other",
  "llm:contract_info": "legal",
  "llm:hr_info": "medical",
  "llm:legal_info": "legal",
  "llm:financial_info": "financial",
  "llm:internal_info": "other",
  "llm:confidential_context": "other"
};

const secretGuardRuleIds = new Set([
  "jwt",
  "aws_access_key",
  "github_token",
  "private_key",
  "env_secret",
  "basic_auth_url",
  "credit_card"
]);

const decisionRank: Record<RiskDecisionLevel, number> = {
  safe: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

export function categoryForFinding(finding: Finding): DlpCategory {
  return finding.category ?? categoryByRuleId[finding.ruleId] ?? "other";
}

function levelFromScore(score: number): RiskDecisionLevel {
  if (score <= 0) {
    return "safe";
  }

  if (score < 20) {
    return "low";
  }

  if (score < 50) {
    return "medium";
  }

  if (score < 80) {
    return "high";
  }

  return "critical";
}

function isSecretGuardFinding(finding: Finding, category: DlpCategory): boolean {
  return category === "secret" || secretGuardRuleIds.has(finding.ruleId);
}

export function scoreRisk(findings: Finding[], options: RiskScoreOptions = {}): RiskScoreResult {
  const categoryCounts: Record<string, number> = {};
  const reasons: string[] = [];
  let score = 0;
  let secretGuard = false;

  for (const finding of findings) {
    const category = categoryForFinding(finding);
    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
    score += scoreByCategory[category];

    if (isSecretGuardFinding(finding, category)) {
      secretGuard = true;
      reasons.push(`秘密情報保護の対象: ${finding.label}`);
    }
  }

  if ((categoryCounts.person ?? 0) > 0 && (categoryCounts.address ?? 0) > 0) {
    score += 15;
    reasons.push("人名候補と住所候補が同時に含まれています。");
  }

  if ((categoryCounts.person ?? 0) > 0 && (categoryCounts.phone ?? 0) > 0) {
    score += 15;
    reasons.push("人名候補と電話番号が同時に含まれています。");
  }

  const cappedScore = Math.min(score, 100);
  const level = levelFromScore(cappedScore);
  const blockAtLevel = options.blockAtLevel ?? "high";
  const blocked = secretGuard || decisionRank[level] >= decisionRank[blockAtLevel];

  return {
    score: cappedScore,
    level,
    blocked,
    secretGuard,
    categoryCounts,
    reasons
  };
}
