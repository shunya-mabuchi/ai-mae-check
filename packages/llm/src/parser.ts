import { DEFAULT_CONFIDENCE_THRESHOLD, DEFAULT_MAX_CANDIDATES } from "./constants";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toCategory(value: unknown): ContextRiskCategory {
  return typeof value === "string" && categories.includes(value as ContextRiskCategory)
    ? (value as ContextRiskCategory)
    : "other";
}

function toRiskLevel(value: unknown): "high" | "medium" | "low" {
  return value === "high" || value === "medium" || value === "low" ? value : "low";
}

function clampConfidence(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function extractJson(rawText: string): string {
  try {
    JSON.parse(rawText);
    return rawText;
  } catch {
    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return rawText.slice(start, end + 1);
    }
    return rawText;
  }
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
    parsed = JSON.parse(extractJson(rawText));
  } catch {
    throw new Error("AI文脈チェックの結果を読み取れませんでした");
  }

  if (!isRecord(parsed)) {
    throw new Error("AI文脈チェックの結果を読み取れませんでした");
  }

  const rawCandidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
  const candidates: ContextRiskCandidate[] = [];

  for (const rawCandidate of rawCandidates) {
    if (!isRecord(rawCandidate)) {
      continue;
    }

    const surface = typeof rawCandidate.surface === "string" ? rawCandidate.surface.trim() : "";
    const label = typeof rawCandidate.label === "string" ? rawCandidate.label.trim() : "";
    const reason = typeof rawCandidate.reason === "string" ? rawCandidate.reason.trim() : "";
    const confidence = clampConfidence(rawCandidate.confidence);

    if (surface.length === 0 || confidence < confidenceThreshold) {
      continue;
    }

    candidates.push({
      id: `llm-candidate-${candidates.length + 1}`,
      category: toCategory(rawCandidate.category),
      surface,
      label: label.length > 0 ? label : "文脈リスク候補",
      reason: reason.length > 0 ? reason : "外部に貼る前に確認したい候補です。",
      riskLevel: toRiskLevel(rawCandidate.riskLevel),
      suggestedPlaceholder:
        typeof rawCandidate.suggestedPlaceholder === "string" && rawCandidate.suggestedPlaceholder.trim().length > 0
          ? rawCandidate.suggestedPlaceholder.trim()
          : "[CONTEXT_1]",
      confidence
    });

    if (candidates.length >= maxCandidates) {
      break;
    }
  }

  return {
    candidates,
    summary:
      typeof parsed.summary === "string" && parsed.summary.trim().length > 0
        ? parsed.summary.trim()
        : "AI文脈チェックの追加候補を確認しました。"
  };
}
