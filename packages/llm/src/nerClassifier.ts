import type { RiskLevel } from "@ai-mae-check/core";
import type { ContextRiskCandidate, ContextRiskCategory } from "./types";

export interface NerToken {
  entity: string;
  score: number;
  word: string;
  index: number;
  start?: number;
  end?: number;
}

interface NerDefinition {
  category: Extract<
    ContextRiskCategory,
    "person_name" | "company_name" | "location_name" | "facility_name" | "product_name" | "event_name"
  >;
  label: string;
  reason: string;
  placeholderPrefix: string;
  riskLevel: RiskLevel;
}

interface EntitySpan {
  definition: NerDefinition;
  entityLabel: string;
  start: number;
  end: number;
  scores: number[];
}

const definitions: Record<string, NerDefinition> = {
  PER: {
    category: "person_name",
    label: "人名候補",
    reason: "人名として抽出された表現です。外部に送る前に確認したい候補です。",
    placeholderPrefix: "PERSON",
    riskLevel: "medium"
  },
  ORG: {
    category: "company_name",
    label: "組織名・会社名候補",
    reason: "組織名または会社名として抽出された表現です。外部に送る前に確認したい候補です。",
    placeholderPrefix: "COMPANY",
    riskLevel: "medium"
  },
  "ORG-P": {
    category: "company_name",
    label: "組織名候補",
    reason: "組織名として抽出された表現です。外部に送る前に確認したい候補です。",
    placeholderPrefix: "COMPANY",
    riskLevel: "medium"
  },
  "ORG-O": {
    category: "company_name",
    label: "組織名候補",
    reason: "組織名として抽出された表現です。外部に送る前に確認したい候補です。",
    placeholderPrefix: "COMPANY",
    riskLevel: "medium"
  },
  LOC: {
    category: "location_name",
    label: "地名・住所候補",
    reason: "地名または住所の一部として抽出された表現です。外部に送る前に確認したい候補です。",
    placeholderPrefix: "LOCATION",
    riskLevel: "medium"
  },
  INS: {
    category: "facility_name",
    label: "施設名候補",
    reason: "施設名として抽出された表現です。外部に送る前に確認したい候補です。",
    placeholderPrefix: "FACILITY",
    riskLevel: "medium"
  },
  PRD: {
    category: "product_name",
    label: "製品名候補",
    reason: "製品名として抽出された表現です。公開前の名称でないか確認したい候補です。",
    placeholderPrefix: "PRODUCT",
    riskLevel: "low"
  },
  EVT: {
    category: "event_name",
    label: "イベント名候補",
    reason: "イベント名として抽出された表現です。公開前の名称でないか確認したい候補です。",
    placeholderPrefix: "EVENT",
    riskLevel: "low"
  }
};

function normalizeEntityLabel(entity: string): string {
  return entity.replace(/^[BI]-/u, "");
}

function isValidToken(input: string, token: NerToken, threshold: number): token is Required<NerToken> {
  return (
    token.entity !== "O" &&
    token.score >= threshold &&
    typeof token.start === "number" &&
    typeof token.end === "number" &&
    Number.isInteger(token.start) &&
    Number.isInteger(token.end) &&
    token.start >= 0 &&
    token.end > token.start &&
    token.end <= input.length
  );
}

function canMerge(
  input: string,
  span: EntitySpan,
  definition: NerDefinition,
  entityLabel: string,
  token: Required<NerToken>
): boolean {
  if (
    span.definition.category !== definition.category ||
    span.entityLabel !== entityLabel ||
    token.start < span.end
  ) {
    return false;
  }

  const gap = input.slice(span.end, token.start);
  return gap.length <= 1 && /^\s*$/u.test(gap);
}

function trimSpan(input: string, start: number, end: number): { start: number; end: number } {
  let nextStart = start;
  let nextEnd = end;
  while (nextStart < nextEnd && /\s/u.test(input[nextStart] ?? "")) {
    nextStart += 1;
  }
  while (nextEnd > nextStart && /\s/u.test(input[nextEnd - 1] ?? "")) {
    nextEnd -= 1;
  }
  return { start: nextStart, end: nextEnd };
}

export function createNerContextCandidates(
  input: string,
  tokens: readonly NerToken[],
  options: { confidenceThreshold?: number; maxCandidates?: number } = {}
): ContextRiskCandidate[] {
  const threshold = options.confidenceThreshold ?? 0.72;
  const maxCandidates = options.maxCandidates ?? 12;
  const spans: EntitySpan[] = [];

  for (const token of tokens) {
    if (!isValidToken(input, token, threshold)) {
      continue;
    }
    const entityLabel = normalizeEntityLabel(token.entity);
    const definition = definitions[entityLabel];
    if (!definition) {
      continue;
    }

    const previous = spans.at(-1);
    if (previous && canMerge(input, previous, definition, entityLabel, token)) {
      previous.end = token.end;
      previous.scores.push(token.score);
      continue;
    }

    spans.push({ definition, entityLabel, start: token.start, end: token.end, scores: [token.score] });
  }

  const counters = new Map<string, number>();
  const seen = new Set<string>();
  const candidates: ContextRiskCandidate[] = [];

  for (const span of spans) {
    if (candidates.length >= maxCandidates) {
      break;
    }
    const range = trimSpan(input, span.start, span.end);
    const surface = input.slice(range.start, range.end);
    if (surface.length === 0) {
      continue;
    }
    const key = `${span.definition.category}:${range.start}:${range.end}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    const count = (counters.get(span.definition.placeholderPrefix) ?? 0) + 1;
    counters.set(span.definition.placeholderPrefix, count);
    const confidence = span.scores.reduce((sum, score) => sum + score, 0) / span.scores.length;
    candidates.push({
      id: `ner-${span.definition.category}-${count}`,
      category: span.definition.category,
      surface,
      label: span.definition.label,
      reason: `${span.definition.reason} ブラウザ内の固有表現抽出モデルによる補助候補です。`,
      riskLevel: span.definition.riskLevel,
      suggestedPlaceholder: `[${span.definition.placeholderPrefix}_${count}]`,
      confidence,
      start: range.start,
      end: range.end
    });
  }

  return candidates;
}
