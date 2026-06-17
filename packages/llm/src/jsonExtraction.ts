function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
}

function findFencedJsonBlocks(rawText: string): string[] {
  const blocks: string[] = [];
  const pattern = /```(?:json|JSON)?\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(rawText)) !== null) {
    if (match[1]) {
      blocks.push(match[1]);
    }
  }

  return blocks;
}

function findBalancedObjects(rawText: string): string[] {
  return findBalancedJsonValues(rawText, "{", "}");
}

function findBalancedArrays(rawText: string): string[] {
  return findBalancedJsonValues(rawText, "[", "]");
}

function findBalancedJsonValues(rawText: string, openChar: "{" | "[", closeChar: "}" | "]"): string[] {
  const values: string[] = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < rawText.length; index += 1) {
    const char = rawText[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === openChar) {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
      continue;
    }

    if (char === closeChar && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        values.push(rawText.slice(start, index + 1));
        start = -1;
      }
    }
  }

  return values;
}

function normalizeJsonCandidate(candidate: string): string {
  return candidate
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");
}

function parseJsonCandidate(candidate: string): { parsed: unknown; source: string } | null {
  const trimmedCandidate = candidate.trim().replace(/^\uFEFF/, "");

  try {
    return { parsed: JSON.parse(trimmedCandidate), source: trimmedCandidate };
  } catch {
    const normalizedCandidate = normalizeJsonCandidate(candidate);
    try {
      return { parsed: JSON.parse(normalizedCandidate), source: normalizedCandidate };
    } catch {
      return null;
    }
  }
}

function hasPreferredKey(parsed: unknown, preferredKeys: string[]): boolean {
  if (preferredKeys.length === 0) {
    return true;
  }

  if (Array.isArray(parsed)) {
    return true;
  }

  return isRecord(parsed) && preferredKeys.some((key) => Object.prototype.hasOwnProperty.call(parsed, key));
}

export function extractJsonObject(rawText: string, preferredKeys: string[] = []): string {
  const candidates = unique([
    rawText,
    ...findFencedJsonBlocks(rawText),
    ...findBalancedObjects(rawText),
    ...findBalancedArrays(rawText)
  ]);
  let firstJsonValue = "";

  for (const candidate of candidates) {
    const result = parseJsonCandidate(candidate);
    if (!result || (!isRecord(result.parsed) && !Array.isArray(result.parsed))) {
      continue;
    }

    if (firstJsonValue.length === 0) {
      firstJsonValue = result.source;
    }

    if (hasPreferredKey(result.parsed, preferredKeys)) {
      return result.source;
    }
  }

  return firstJsonValue.length > 0 ? firstJsonValue : rawText;
}
