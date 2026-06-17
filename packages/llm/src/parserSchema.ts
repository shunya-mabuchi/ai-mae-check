import type { RiskLevel } from "@ai-mae-check/core";
import type { ContextRiskCategory } from "./types";

const contextRiskCategories: ContextRiskCategory[] = [
  "person_name",
  "company_name",
  "customer_name",
  "project_name",
  "contract_info",
  "hr_info",
  "legal_info",
  "financial_info",
  "internal_info",
  "confidential_context",
  "other"
];

const candidateListKeys = [
  "candidates",
  "risks",
  "riskCandidates",
  "contextRiskCandidates",
  "items",
  "findings",
  "候補",
  "注意候補",
  "リスク候補",
  "文脈候補"
] as const;

const summaryKeys = ["summary", "要約", "概要", "まとめ"] as const;

const candidateStringKeys = {
  surface: ["surface", "該当テキスト", "対象テキスト", "表現", "文字列", "テキスト"],
  label: ["label", "ラベル", "候補ラベル", "表示名"],
  reason: ["reason", "理由", "説明"],
  suggestedPlaceholder: ["suggestedPlaceholder", "placeholder", "プレースホルダー", "マスク候補"]
} as const;

const candidateValueKeys = {
  category: ["category", "カテゴリ", "分類", "種別"],
  riskLevel: ["riskLevel", "risk_level", "危険度", "リスク"],
  confidence: ["confidence", "信頼度", "確信度"]
} as const;

const categoryAliases: Record<string, ContextRiskCategory> = {
  人名: "person_name",
  人名候補: "person_name",
  個人名: "person_name",
  会社名: "company_name",
  会社名候補: "company_name",
  顧客名: "customer_name",
  顧客名候補: "customer_name",
  案件名: "project_name",
  案件名候補: "project_name",
  プロジェクト名: "project_name",
  プロジェクト名候補: "project_name",
  契約情報: "contract_info",
  契約情報候補: "contract_info",
  採用情報: "hr_info",
  人事情報: "hr_info",
  法務情報: "legal_info",
  金融情報: "financial_info",
  財務情報: "financial_info",
  社内情報: "internal_info",
  機密文脈: "confidential_context",
  社外秘文脈: "confidential_context",
  その他: "other"
};

export type CandidateStringField = keyof typeof candidateStringKeys;
export type CandidateValueField = keyof typeof candidateValueKeys;

export const contextAnalysisPreferredKeys = [...candidateListKeys, ...summaryKeys];

export function isContextAnalysisRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstString(record: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") {
      return value.trim();
    }
  }

  return "";
}

function firstValue(record: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return record[key];
    }
  }

  return undefined;
}

export function getContextAnalysisSummary(parsed: unknown): string {
  if (!isContextAnalysisRecord(parsed)) {
    return "";
  }

  return firstString(parsed, summaryKeys);
}

export function getContextAnalysisCandidateValues(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (!isContextAnalysisRecord(parsed)) {
    return [];
  }

  for (const key of candidateListKeys) {
    const value = parsed[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

export function readCandidateString(record: Record<string, unknown>, field: CandidateStringField): string {
  return firstString(record, candidateStringKeys[field]);
}

export function readCandidateValue(record: Record<string, unknown>, field: CandidateValueField): unknown {
  return firstValue(record, candidateValueKeys[field]);
}

export function toContextRiskCategory(value: unknown): ContextRiskCategory {
  if (typeof value !== "string") {
    return "other";
  }

  const normalized = value.trim();
  if (contextRiskCategories.includes(normalized as ContextRiskCategory)) {
    return normalized as ContextRiskCategory;
  }

  return categoryAliases[normalized] ?? "other";
}

export function toContextRiskLevel(value: unknown): RiskLevel {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  if (value === "高" || value === "高リスク") {
    return "high";
  }

  if (value === "中" || value === "中リスク") {
    return "medium";
  }

  if (value === "低" || value === "低リスク") {
    return "low";
  }

  return "low";
}

export function clampConfidence(value: unknown): number {
  const numericValue = typeof value === "string" ? Number(value) : value;
  if (typeof numericValue !== "number" || Number.isNaN(numericValue)) {
    return 0;
  }

  return Math.min(1, Math.max(0, numericValue));
}
