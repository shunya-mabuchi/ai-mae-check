import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { detectSensitiveText, evaluateDlpPolicy, transformText } from "../packages/core/src";

interface DlpEvalPolicyExpectation {
  action?: string;
  severity?: string;
  canSendRaw?: boolean;
  requiresSanitization?: boolean;
}

interface DlpEvalSummaryExpectation {
  total?: number;
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
}

interface DlpEvalExpectation {
  summary?: DlpEvalSummaryExpectation;
  includesRuleIds?: string[];
  excludesRuleIds?: string[];
  policy?: DlpEvalPolicyExpectation;
  generalizedIncludes?: string[];
  generalizedExcludes?: string[];
  maskedIncludes?: string[];
  maskedExcludes?: string[];
}

interface DlpEvalFixture {
  id: string;
  category: string;
  description: string;
  input: string;
  expect: DlpEvalExpectation;
}

const fixtureDir = path.resolve(process.cwd(), "fixtures", "dlp");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} は空ではない文字列である必要があります。`);
  }
  return value;
}

function readStringArray(value: unknown, label: string): string[] | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} は文字列配列である必要があります。`);
  }
  return value;
}

function readBoolean(value: unknown, label: string): boolean | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new Error(`${label} はbooleanである必要があります。`);
  }
  return value;
}

function readNumber(value: unknown, label: string): number | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }
  if (typeof value !== "number") {
    throw new Error(`${label} はnumberである必要があります。`);
  }
  return value;
}

function readExpectation(value: unknown, label: string): DlpEvalExpectation {
  if (!isRecord(value)) {
    throw new Error(`${label} はobjectである必要があります。`);
  }

  const summary = isRecord(value.summary)
    ? {
        total: readNumber(value.summary.total, `${label}.summary.total`),
        critical: readNumber(value.summary.critical, `${label}.summary.critical`),
        high: readNumber(value.summary.high, `${label}.summary.high`),
        medium: readNumber(value.summary.medium, `${label}.summary.medium`),
        low: readNumber(value.summary.low, `${label}.summary.low`)
      }
    : undefined;
  const policy = isRecord(value.policy)
    ? {
        action: typeof value.policy.action === "string" ? value.policy.action : undefined,
        severity: typeof value.policy.severity === "string" ? value.policy.severity : undefined,
        canSendRaw: readBoolean(value.policy.canSendRaw, `${label}.policy.canSendRaw`),
        requiresSanitization: readBoolean(value.policy.requiresSanitization, `${label}.policy.requiresSanitization`)
      }
    : undefined;

  return {
    ...(summary ? { summary } : {}),
    includesRuleIds: readStringArray(value.includesRuleIds, `${label}.includesRuleIds`),
    excludesRuleIds: readStringArray(value.excludesRuleIds, `${label}.excludesRuleIds`),
    ...(policy ? { policy } : {}),
    generalizedIncludes: readStringArray(value.generalizedIncludes, `${label}.generalizedIncludes`),
    generalizedExcludes: readStringArray(value.generalizedExcludes, `${label}.generalizedExcludes`),
    maskedIncludes: readStringArray(value.maskedIncludes, `${label}.maskedIncludes`),
    maskedExcludes: readStringArray(value.maskedExcludes, `${label}.maskedExcludes`)
  };
}

function readFixture(fileName: string): DlpEvalFixture {
  const parsed: unknown = JSON.parse(readFileSync(path.join(fixtureDir, fileName), "utf8"));
  if (!isRecord(parsed)) {
    throw new Error(`${fileName} はobjectである必要があります。`);
  }

  return {
    id: readString(parsed.id, `${fileName}.id`),
    category: readString(parsed.category, `${fileName}.category`),
    description: readString(parsed.description, `${fileName}.description`),
    input: readString(parsed.input, `${fileName}.input`),
    expect: readExpectation(parsed.expect, `${fileName}.expect`)
  };
}

function expectIncludesAll(actualValues: string[], expectedValues: string[] | undefined): void {
  if (!expectedValues) {
    return;
  }
  expect(actualValues).toEqual(expect.arrayContaining(expectedValues));
}

function expectExcludesAll(actualValues: string[], expectedValues: string[] | undefined): void {
  if (!expectedValues) {
    return;
  }
  for (const expectedValue of expectedValues) {
    expect(actualValues).not.toContain(expectedValue);
  }
}

function expectTextIncludes(text: string, expectedValues: string[] | undefined): void {
  if (!expectedValues) {
    return;
  }
  for (const expectedValue of expectedValues) {
    expect(text).toContain(expectedValue);
  }
}

function expectTextExcludes(text: string, expectedValues: string[] | undefined): void {
  if (!expectedValues) {
    return;
  }
  for (const expectedValue of expectedValues) {
    expect(text).not.toContain(expectedValue);
  }
}

const fixtures = readdirSync(fixtureDir)
  .filter((fileName) => fileName.endsWith(".json"))
  .sort()
  .map(readFixture);

describe("DLP evaluation fixtures", () => {
  it("fixture idが重複していない", () => {
    const ids = fixtures.map((fixture) => fixture.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const fixture of fixtures) {
    it(`${fixture.id}: ${fixture.description}`, () => {
      const detection = detectSensitiveText(fixture.input);
      const policy = evaluateDlpPolicy(detection.findings);
      const generalized = transformText(fixture.input, detection.findings, "generalize");
      const masked = transformText(fixture.input, detection.findings, "mask");
      const ruleIds = detection.findings.map((finding) => finding.ruleId);

      if (fixture.expect.summary) {
        expect(detection.summary).toMatchObject(fixture.expect.summary);
      }

      expectIncludesAll(ruleIds, fixture.expect.includesRuleIds);
      expectExcludesAll(ruleIds, fixture.expect.excludesRuleIds);

      if (fixture.expect.policy) {
        expect(policy).toMatchObject(fixture.expect.policy);
      }

      expectTextIncludes(generalized.transformedText, fixture.expect.generalizedIncludes);
      expectTextExcludes(generalized.transformedText, fixture.expect.generalizedExcludes);
      expectTextIncludes(masked.transformedText, fixture.expect.maskedIncludes);
      expectTextExcludes(masked.transformedText, fixture.expect.maskedExcludes);

      console.info(
        `${fixture.id}: total=${detection.summary.total} high=${detection.summary.high + detection.summary.critical} medium=${detection.summary.medium} low=${detection.summary.low} action=${policy.action} severity=${policy.severity}`
      );
    });
  }
});
