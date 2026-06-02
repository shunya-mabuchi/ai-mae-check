import type { Finding, PlaceholderMap, RiskLevel } from "./types";

const riskOrder: Record<RiskLevel, number> = {
  high: 3,
  medium: 2,
  low: 1
};

function overlaps(left: Finding, right: Finding): boolean {
  return left.start < right.end && right.start < left.end;
}

function placeholderBase(placeholder: string): string {
  const match = /^\[([A-Z0-9_]+?)(?:_\d+)?\]$/.exec(placeholder);
  return match?.[1] ?? "MASK";
}

export function normalizeFindings(findings: Finding[]): Finding[] {
  const validFindings = findings
    .filter((finding) => finding.start >= 0 && finding.end > finding.start)
    .map((finding) => ({ ...finding }));

  const prioritySorted = [...validFindings].sort((left, right) => {
    const riskDiff = riskOrder[right.riskLevel] - riskOrder[left.riskLevel];
    if (riskDiff !== 0) {
      return riskDiff;
    }

    const lengthDiff = right.end - right.start - (left.end - left.start);
    if (lengthDiff !== 0) {
      return lengthDiff;
    }

    const startDiff = left.start - right.start;
    if (startDiff !== 0) {
      return startDiff;
    }

    return left.ruleId.localeCompare(right.ruleId);
  });

  const accepted: Finding[] = [];
  for (const finding of prioritySorted) {
    if (!accepted.some((candidate) => overlaps(candidate, finding))) {
      accepted.push(finding);
    }
  }

  const counters = new Map<string, number>();
  return accepted
    .sort((left, right) => left.start - right.start || left.end - right.end || left.ruleId.localeCompare(right.ruleId))
    .map((finding) => {
      const base = placeholderBase(finding.placeholder);
      const count = (counters.get(base) ?? 0) + 1;
      counters.set(base, count);
      return {
        ...finding,
        placeholder: `[${base}_${count}]`,
        id: finding.id || `${finding.source}:${finding.ruleId}:${finding.start}:${finding.end}`
      };
    });
}

export function createPlaceholderMap(findings: Finding[]): PlaceholderMap {
  return findings.map((finding) => ({
    placeholder: finding.placeholder,
    originalText: finding.text,
    label: finding.label,
    riskLevel: finding.riskLevel
  }));
}

export function maskSensitiveText(input: string, findings: Finding[]) {
  const normalizedFindings = normalizeFindings(findings);
  let maskedText = input;

  for (const finding of [...normalizedFindings].sort((left, right) => right.start - left.start)) {
    maskedText = `${maskedText.slice(0, finding.start)}${finding.placeholder}${maskedText.slice(finding.end)}`;
  }

  return {
    maskedText,
    placeholderMap: createPlaceholderMap(normalizedFindings),
    findings: normalizedFindings
  };
}

export function mergeFindings(ruleFindings: Finding[], llmFindings: Finding[]): Finding[] {
  return normalizeFindings([...ruleFindings, ...llmFindings]);
}
