import type { Finding } from "@harumae/core";
import { DEFAULT_CONFIDENCE_THRESHOLD } from "./constants";
import type { ContextRiskCandidate, ContextRiskCategory, ConvertCandidatesOptions } from "./types";

const placeholderPrefixByCategory: Record<ContextRiskCategory, string> = {
  person_name: "PERSON",
  company_name: "COMPANY",
  customer_name: "CUSTOMER",
  project_name: "PROJECT",
  contract_info: "CONTRACT_INFO",
  hr_info: "HR_INFO",
  legal_info: "LEGAL_INFO",
  financial_info: "FINANCIAL_INFO",
  internal_info: "INTERNAL_INFO",
  confidential_context: "CONFIDENTIAL_CONTEXT",
  other: "CONTEXT"
};

function findOccurrences(input: string, surface: string, includeAllOccurrences: boolean): Array<{ start: number; end: number }> {
  const occurrences: Array<{ start: number; end: number }> = [];
  let cursor = 0;

  while (cursor < input.length) {
    const start = input.indexOf(surface, cursor);
    if (start === -1) {
      break;
    }

    const end = start + surface.length;
    occurrences.push({ start, end });

    if (!includeAllOccurrences) {
      break;
    }

    cursor = end;
  }

  return occurrences;
}

export function convertContextCandidatesToFindings(
  input: string,
  candidates: ContextRiskCandidate[],
  options: ConvertCandidatesOptions = {}
): Finding[] {
  const threshold = options.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  const includeAllOccurrences = options.includeAllOccurrences ?? true;
  const counters = new Map<string, number>();
  const findings: Finding[] = [];

  for (const candidate of candidates) {
    if (candidate.confidence < threshold || candidate.surface.length === 0) {
      continue;
    }

    const occurrences = findOccurrences(input, candidate.surface, includeAllOccurrences);
    const prefix = placeholderPrefixByCategory[candidate.category];

    for (const occurrence of occurrences) {
      const count = (counters.get(prefix) ?? 0) + 1;
      counters.set(prefix, count);
      findings.push({
        id: `llm:${candidate.category}:${occurrence.start}:${occurrence.end}:${count}`,
        ruleId: `llm:${candidate.category}`,
        source: "llm",
        label: candidate.label,
        riskLevel: candidate.riskLevel,
        start: occurrence.start,
        end: occurrence.end,
        text: input.slice(occurrence.start, occurrence.end),
        placeholder: `[${prefix}_${count}]`,
        message: candidate.reason,
        confidence: candidate.confidence
      });
    }
  }

  return findings;
}
