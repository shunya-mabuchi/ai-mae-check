import { DEFAULT_MAX_CANDIDATES } from "./constants";
import type { RiskLevel } from "@ai-mae-check/core";
import type { ContextRiskCandidate, ContextRiskCategory } from "./types";

export interface ResidualContextTerm {
  surface: string;
  prefix: "PERSON" | "PROJECT";
  category: Extract<ContextRiskCategory, "person_name" | "project_name">;
  label: string;
  reason: string;
  riskLevel: RiskLevel;
  confidence: number;
}

const honorificNamePattern = /[\p{Script=Han}々〆ヵヶ]{1,6}(?:様|さん|氏|先生|くん|ちゃん)/gu;
const projectNamePattern = /\bProject\s+[A-Z][A-Za-z0-9-]*(?:\s+[A-Z][A-Za-z0-9-]*){1,5}\b/g;

function personTerm(surface: string): ResidualContextTerm {
  return {
    surface,
    prefix: "PERSON",
    category: "person_name",
    label: "人名候補",
    reason: "敬称つきの個人名らしい表現です。外部に送る前に確認したい候補です。",
    riskLevel: "medium",
    confidence: 0.86
  };
}

function projectTerm(surface: string): ResidualContextTerm {
  return {
    surface,
    prefix: "PROJECT",
    category: "project_name",
    label: "案件名・プロジェクト名候補",
    reason: "Project形式の案件名らしい表現です。外部に送る前に確認したい候補です。",
    riskLevel: "medium",
    confidence: 0.82
  };
}

function uniqueTerms(terms: ResidualContextTerm[]): ResidualContextTerm[] {
  const seen = new Set<string>();
  const unique: ResidualContextTerm[] = [];

  for (const term of terms) {
    const key = `${term.prefix}:${term.surface}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(term);
  }

  return unique.sort((left, right) => right.surface.length - left.surface.length);
}

function normalizeSurface(surface: string): string {
  return surface.replace(/\s+/g, "").toLowerCase();
}

function isDuplicateCandidate(candidate: ContextRiskCandidate, term: ResidualContextTerm): boolean {
  const candidateSurface = normalizeSurface(candidate.surface);
  const termSurface = normalizeSurface(term.surface);

  return candidateSurface.includes(termSurface) || termSurface.includes(candidateSurface);
}

export function extractResidualContextTerms(input: string): ResidualContextTerm[] {
  const terms: ResidualContextTerm[] = [];

  for (const match of input.matchAll(honorificNamePattern)) {
    terms.push(personTerm(match[0]));
  }

  for (const match of input.matchAll(projectNamePattern)) {
    terms.push(projectTerm(match[0]));
  }

  return uniqueTerms(terms);
}

export function mergeResidualContextCandidates(
  input: string,
  candidates: ContextRiskCandidate[],
  options: { maxCandidates?: number } = {}
): ContextRiskCandidate[] {
  const maxCandidates = options.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
  const merged = [...candidates];
  const counters = new Map<ResidualContextTerm["prefix"], number>();

  for (const candidate of candidates) {
    const prefix = candidate.category === "person_name" ? "PERSON" : candidate.category === "project_name" ? "PROJECT" : null;
    if (prefix) {
      counters.set(prefix, (counters.get(prefix) ?? 0) + 1);
    }
  }

  for (const term of extractResidualContextTerms(input)) {
    if (merged.length >= maxCandidates) {
      break;
    }

    if (merged.some((candidate) => isDuplicateCandidate(candidate, term))) {
      continue;
    }

    const count = (counters.get(term.prefix) ?? 0) + 1;
    counters.set(term.prefix, count);
    merged.push({
      id: `local-context-${term.category}-${count}`,
      category: term.category,
      surface: term.surface,
      label: term.label,
      reason: term.reason,
      riskLevel: term.riskLevel,
      suggestedPlaceholder: `[${term.prefix}_${count}]`,
      confidence: term.confidence
    });
  }

  return merged;
}

export function maskResidualContextTerms(safePrompt: string, originalInput?: string): string {
  if (!originalInput || safePrompt.length === 0) {
    return safePrompt;
  }

  let masked = safePrompt;
  const counters = new Map<ResidualContextTerm["prefix"], number>();

  for (const term of extractResidualContextTerms(originalInput)) {
    if (!masked.includes(term.surface)) {
      continue;
    }

    const count = (counters.get(term.prefix) ?? 0) + 1;
    counters.set(term.prefix, count);
    masked = masked.split(term.surface).join(`[${term.prefix}_${count}]`);
  }

  return masked;
}
