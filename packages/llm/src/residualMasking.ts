import { DEFAULT_MAX_CANDIDATES } from "./constants";
import { extractResidualBusinessTerms, isBusinessContextCategory } from "./residualBusinessTerms";
import { extractResidualEntityTerms } from "./residualEntityTerms";
import type { ResidualContextTerm, ResidualPrefix } from "./residualTypes";
import type { ContextRiskCandidate, ContextRiskCategory } from "./types";

const prefixByCategory: Partial<Record<ContextRiskCategory, ResidualPrefix>> = {
  person_name: "PERSON",
  company_name: "COMPANY",
  customer_name: "CUSTOMER",
  project_name: "PROJECT",
  contract_info: "CONTRACT_INFO",
  hr_info: "HR_INFO",
  legal_info: "LEGAL_INFO",
  financial_info: "FINANCIAL_INFO",
  internal_info: "INTERNAL_INFO",
  confidential_context: "CONFIDENTIAL_CONTEXT"
};

function uniqueTerms(terms: ResidualContextTerm[]): ResidualContextTerm[] {
  const seen = new Set<string>();
  const unique: ResidualContextTerm[] = [];

  for (const term of terms) {
    const key = `${term.prefix}:${term.surface}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(term);
    }
  }

  return unique.sort((left, right) => right.surface.length - left.surface.length);
}

function normalizeSurface(surface: string): string {
  return surface.replace(/\s+/g, "").toLowerCase();
}

function isDuplicateCandidate(candidate: ContextRiskCandidate, term: ResidualContextTerm): boolean {
  const organizationCategories: ContextRiskCategory[] = ["company_name", "customer_name"];
  const sameCategory = candidate.category === term.category;
  const bothOrganizations =
    organizationCategories.includes(candidate.category) && organizationCategories.includes(term.category);
  if (!sameCategory && !bothOrganizations) return false;

  const candidateSurface = normalizeSurface(candidate.surface);
  const termSurface = normalizeSurface(term.surface);
  return candidateSurface.includes(termSurface) || termSurface.includes(candidateSurface);
}

function hasSpecificBusinessTerm(candidate: ContextRiskCandidate, terms: ResidualContextTerm[]): boolean {
  if (!isBusinessContextCategory(candidate.category)) return false;

  const candidateSurface = normalizeSurface(candidate.surface);
  return terms.some(
    (term) =>
      isBusinessContextCategory(term.category) && candidateSurface.includes(normalizeSurface(term.surface))
  );
}

export function extractResidualContextTerms(input: string): ResidualContextTerm[] {
  return uniqueTerms([
    ...extractResidualEntityTerms(input),
    ...extractResidualBusinessTerms(input)
  ]);
}

export function mergeResidualContextCandidates(
  input: string,
  candidates: ContextRiskCandidate[],
  options: { maxCandidates?: number } = {}
): ContextRiskCandidate[] {
  const maxCandidates = options.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
  const residualTerms = extractResidualContextTerms(input);
  const prioritizedCandidates = candidates.filter(
    (candidate) => !hasSpecificBusinessTerm(candidate, residualTerms)
  );
  const merged = [...prioritizedCandidates];
  const counters = new Map<ResidualPrefix, number>();

  for (const candidate of prioritizedCandidates) {
    const prefix = prefixByCategory[candidate.category];
    if (prefix) counters.set(prefix, (counters.get(prefix) ?? 0) + 1);
  }

  for (const term of residualTerms) {
    if (merged.length >= maxCandidates) break;
    if (merged.some((candidate) => isDuplicateCandidate(candidate, term))) continue;

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
