import { DEFAULT_CONFIDENCE_THRESHOLD, DEFAULT_MAX_CANDIDATES, MAX_CONTEXT_SURFACE_CHARS } from "./constants";
import { extractJsonObject } from "./jsonExtraction";
import {
  clampConfidence,
  contextAnalysisPreferredKeys,
  getContextAnalysisCandidateValues,
  getContextAnalysisSummary,
  isContextAnalysisRecord,
  readCandidateString,
  readCandidateValue,
  toContextRiskCategory,
  toContextRiskLevel
} from "./parserSchema";
import type { ContextRiskCandidate } from "./types";

export interface ParseContextAnalysisOptions {
  maxCandidates?: number;
  confidenceThreshold?: number;
}

const JSON_PARSE_FAILURE_MESSAGE = "AI文脈チェックの結果を読み取れませんでした";

export function parseContextAnalysisJson(rawText: string, options: ParseContextAnalysisOptions = {}) {
  const maxCandidates = options.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
  const confidenceThreshold = options.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJsonObject(rawText, contextAnalysisPreferredKeys));
  } catch {
    throw new Error(JSON_PARSE_FAILURE_MESSAGE);
  }

  if (!isContextAnalysisRecord(parsed) && !Array.isArray(parsed)) {
    throw new Error(JSON_PARSE_FAILURE_MESSAGE);
  }

  const rawCandidates = getContextAnalysisCandidateValues(parsed);
  const candidates: ContextRiskCandidate[] = [];

  for (const rawCandidate of rawCandidates) {
    if (!isContextAnalysisRecord(rawCandidate)) {
      continue;
    }

    const surface = readCandidateString(rawCandidate, "surface");
    const label = readCandidateString(rawCandidate, "label");
    const reason = readCandidateString(rawCandidate, "reason");
    const confidence = clampConfidence(readCandidateValue(rawCandidate, "confidence"));
    const suggestedPlaceholder = readCandidateString(rawCandidate, "suggestedPlaceholder");

    if (surface.length === 0 || surface.length > MAX_CONTEXT_SURFACE_CHARS || confidence < confidenceThreshold) {
      continue;
    }

    candidates.push({
      id: `llm-candidate-${candidates.length + 1}`,
      category: toContextRiskCategory(readCandidateValue(rawCandidate, "category")),
      surface,
      label: label.length > 0 ? label : "文脈リスク候補",
      reason: reason.length > 0 ? reason : "外部に送る前に確認したい候補です。",
      riskLevel: toContextRiskLevel(readCandidateValue(rawCandidate, "riskLevel")),
      suggestedPlaceholder: suggestedPlaceholder.length > 0 ? suggestedPlaceholder : "[CONTEXT_1]",
      confidence
    });

    if (candidates.length >= maxCandidates) {
      break;
    }
  }

  const summary = getContextAnalysisSummary(parsed);

  return {
    candidates,
    summary: summary.length > 0 ? summary : "AI文脈チェックの追加候補を確認しました。"
  };
}
