import { detectSensitiveText, evaluateDlpPolicy, type DlpCategory, type RiskLevel } from "@ai-mae-check/core";
import { extractJsonObject } from "./jsonExtraction";
import { maskResidualContextTerms } from "./residualMasking";
import type { ParsedSanitizeAnalysis, SanitizeAction, SanitizeAnalysisResult, SanitizeDetectedCategory } from "./types";

const categories: DlpCategory[] = [
  "person",
  "organization",
  "address",
  "email",
  "phone",
  "id",
  "secret",
  "financial",
  "medical",
  "legal",
  "date",
  "url",
  "file",
  "other"
];

const actions: SanitizeAction[] = ["mask", "generalize", "remove", "block"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toRiskLevel(value: unknown): RiskLevel {
  return value === "critical" || value === "high" || value === "medium" || value === "low" ? value : "low";
}

function toCategory(value: unknown): DlpCategory {
  return typeof value === "string" && categories.includes(value as DlpCategory) ? (value as DlpCategory) : "other";
}

function toAction(value: unknown): SanitizeAction {
  return typeof value === "string" && actions.includes(value as SanitizeAction) ? (value as SanitizeAction) : "generalize";
}

function readString(record: Record<string, unknown>, snakeKey: string, camelKey: string): string {
  const value = record[snakeKey] ?? record[camelKey];
  return typeof value === "string" ? value.trim() : "";
}

export function parseSanitizeAnalysisJson(rawText: string): ParsedSanitizeAnalysis {
  let parsed: unknown;

  try {
    parsed = JSON.parse(
      extractJsonObject(rawText, [
        "safe_prompt",
        "safePrompt",
        "detected_categories",
        "detectedCategories",
        "risk_level",
        "riskLevel",
        "block"
      ])
    );
  } catch {
    throw new Error("AI安全化結果を読み取れませんでした");
  }

  if (!isRecord(parsed)) {
    throw new Error("AI安全化結果を読み取れませんでした");
  }

  const detectedCategories: SanitizeDetectedCategory[] = [];
  const rawCategories = parsed.detected_categories ?? parsed.detectedCategories;

  if (Array.isArray(rawCategories)) {
    for (const rawCategory of rawCategories) {
      if (!isRecord(rawCategory)) {
        continue;
      }

      detectedCategories.push({
        type: toCategory(rawCategory.type),
        risk: toRiskLevel(rawCategory.risk),
        action: toAction(rawCategory.action)
      });
    }
  }

  const safePrompt = readString(parsed, "safe_prompt", "safePrompt");
  const userVisibleExplanation =
    readString(parsed, "user_visible_explanation", "userVisibleExplanation") ||
    "AI文脈チェックにより、送信前の安全化候補を作成しました。";

  return {
    block: parsed.block === true,
    riskLevel: toRiskLevel(parsed.risk_level ?? parsed.riskLevel),
    detectedCategories,
    safePrompt,
    userVisibleExplanation
  };
}

export function createSanitizeAnalysisResult(
  rawText: string,
  modelId: string,
  elapsedMs: number,
  originalInput?: string
): SanitizeAnalysisResult {
  const parsed = parseSanitizeAnalysisJson(rawText);
  const safePrompt = maskResidualContextTerms(parsed.safePrompt, originalInput);
  const residualFindings = safePrompt.length > 0 ? detectSensitiveText(safePrompt).findings : [];
  const residualPolicy = evaluateDlpPolicy(residualFindings);

  return {
    ...parsed,
    safePrompt,
    block: parsed.block || residualPolicy.requiresSanitization,
    rawText,
    modelId,
    elapsedMs,
    residualFindings,
    residualPolicy
  };
}
