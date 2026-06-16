interface ResidualTerm {
  surface: string;
  prefix: "PERSON" | "PROJECT";
}

const honorificNamePattern = /[\p{Script=Han}々〆ヵヶ]{1,6}(?:様|さん|氏|先生|くん|ちゃん)/gu;
const projectNamePattern = /\bProject\s+[A-Z][A-Za-z0-9-]*(?:\s+[A-Z][A-Za-z0-9-]*){1,5}\b/g;

function uniqueTerms(terms: ResidualTerm[]): ResidualTerm[] {
  const seen = new Set<string>();
  const unique: ResidualTerm[] = [];

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

function extractResidualTerms(input: string): ResidualTerm[] {
  const terms: ResidualTerm[] = [];

  for (const match of input.matchAll(honorificNamePattern)) {
    terms.push({ surface: match[0], prefix: "PERSON" });
  }

  for (const match of input.matchAll(projectNamePattern)) {
    terms.push({ surface: match[0], prefix: "PROJECT" });
  }

  return uniqueTerms(terms);
}

export function maskResidualContextTerms(safePrompt: string, originalInput?: string): string {
  if (!originalInput || safePrompt.length === 0) {
    return safePrompt;
  }

  let masked = safePrompt;
  const counters = new Map<ResidualTerm["prefix"], number>();

  for (const term of extractResidualTerms(originalInput)) {
    if (!masked.includes(term.surface)) {
      continue;
    }

    const count = (counters.get(term.prefix) ?? 0) + 1;
    counters.set(term.prefix, count);
    masked = masked.split(term.surface).join(`[${term.prefix}_${count}]`);
  }

  return masked;
}
