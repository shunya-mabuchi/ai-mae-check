import { DEFAULT_CONFIDENCE_THRESHOLD, DEFAULT_MAX_CANDIDATES } from "./constants";
import { extractJsonObject } from "./jsonExtraction";
import type { ContextRiskCandidate, ContextRiskCategory } from "./types";

const categories: ContextRiskCategory[] = [
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toCategory(value: unknown): ContextRiskCategory {
  if (typeof value !== "string") {
    return "other";
  }

  const normalized = value.trim();
  if (categories.includes(normalized as ContextRiskCategory)) {
    return normalized as ContextRiskCategory;
  }

  return categoryAliases[normalized] ?? "other";
}

function toRiskLevel(value: unknown): "high" | "medium" | "low" {
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

function clampConfidence(value: unknown): number {
  const numericValue = typeof value === "string" ? Number(value) : value;
  if (typeof numericValue !== "number" || Number.isNaN(numericValue)) {
    return 0;
  }

  return Math.min(1, Math.max(0, numericValue));
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

function summaryValue(parsed: unknown): string {
  if (!isRecord(parsed)) {
    return "";
  }

  return firstString(parsed, summaryKeys);
}

function candidateValues(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (!isRecord(parsed)) {
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

export interface ParseContextAnalysisOptions {
  maxCandidates?: number;
  confidenceThreshold?: number;
}

export function parseContextAnalysisJson(rawText: string, options: ParseContextAnalysisOptions = {}) {
  const maxCandidates = options.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
  const confidenceThreshold = options.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJsonObject(rawText, [...candidateListKeys, ...summaryKeys]));
  } catch {
    throw new Error("AI文脈チェックの出力形式を読み取れませんでした");
  }

  if (!isRecord(parsed) && !Array.isArray(parsed)) {
    throw new Error("AI文脈チェックの出力形式を読み取れませんでした");
  }

  const rawCandidates = candidateValues(parsed);
  const candidates: ContextRiskCandidate[] = [];

  for (const rawCandidate of rawCandidates) {
    if (!isRecord(rawCandidate)) {
      continue;
    }

    const surface = firstString(rawCandidate, ["surface", "該当テキスト", "対象テキスト", "表現", "文字列", "テキスト"]);
    const label = firstString(rawCandidate, ["label", "ラベル", "候補ラベル", "表示名"]);
    const reason = firstString(rawCandidate, ["reason", "理由", "説明"]);
    const confidence = clampConfidence(firstValue(rawCandidate, ["confidence", "信頼度", "確信度"]));
    const suggestedPlaceholder = firstString(rawCandidate, [
      "suggestedPlaceholder",
      "placeholder",
      "プレースホルダー",
      "マスク候補"
    ]);

    if (surface.length === 0 || confidence < confidenceThreshold) {
      continue;
    }

    candidates.push({
      id: `llm-candidate-${candidates.length + 1}`,
      category: toCategory(firstValue(rawCandidate, ["category", "カテゴリ", "分類", "種別"])),
      surface,
      label: label.length > 0 ? label : "文脈リスク候補",
      reason: reason.length > 0 ? reason : "外部に送る前に確認したい候補です。",
      riskLevel: toRiskLevel(firstValue(rawCandidate, ["riskLevel", "risk_level", "危険度", "リスク"])),
      suggestedPlaceholder: suggestedPlaceholder.length > 0 ? suggestedPlaceholder : "[CONTEXT_1]",
      confidence
    });

    if (candidates.length >= maxCandidates) {
      break;
    }
  }

  return {
    candidates,
    summary: summaryValue(parsed).length > 0 ? summaryValue(parsed) : "AI文脈チェックの追加候補を確認しました。"
  };
}
