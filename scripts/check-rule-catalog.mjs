import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");

const paths = {
  guide: "docs/detection-rule-authoring.md",
  rules: "packages/core/src/rules.ts",
  detectorsIndex: "packages/core/src/detectors/index.ts",
  detectors: [
    "packages/core/src/detectors/pii.ts",
    "packages/core/src/detectors/secret.ts",
    "packages/core/src/detectors/business.ts",
    "packages/core/src/detectors/technical.ts"
  ],
  ruleHelpers: "packages/core/src/ruleHelpers.ts",
  remoteSchema: "packages/core/src/remoteRuleSchema.ts",
  ruleDelivery: "docs/rule-delivery.md",
  operations: "docs/rule-delivery-operations.md",
  qualityProcess: "docs/dlp-rule-quality-process.md",
  readme: "README.md"
};

function fail(message) {
  throw new Error(`Rule catalog QA failed: ${message}`);
}

function read(relativePath) {
  return readFileSync(resolve(rootDir, relativePath), "utf8");
}

function assertIncludes(text, needle, context) {
  if (!text.includes(needle)) {
    fail(`${context} must include: ${needle}`);
  }
}

for (const path of Object.values(paths).flat()) {
  if (!existsSync(resolve(rootDir, path))) {
    fail(`${path} is missing`);
  }
}

const guide = read(paths.guide);
const rulesSource = read(paths.rules);
const detectorsIndex = read(paths.detectorsIndex);
const detectorSources = paths.detectors.map(read).join("\n");
const helperSource = read(paths.ruleHelpers);
const remoteSchema = read(paths.remoteSchema);
const ruleDelivery = read(paths.ruleDelivery);
const operations = read(paths.operations);
const qualityProcess = read(paths.qualityProcess);
const readme = read(paths.readme);

const ruleIds = Array.from(detectorSources.matchAll(/id:\s*"([^"]+)"/gu)).map((match) => match[1]);
if (ruleIds.length < 17) {
  fail(`expected at least 17 bundled rules, got ${ruleIds.length}`);
}

const duplicatedRuleIds = ruleIds.filter((ruleId, index) => ruleIds.indexOf(ruleId) !== index);
if (duplicatedRuleIds.length > 0) {
  fail(`bundled detector rule ids must be unique: ${[...new Set(duplicatedRuleIds)].join(", ")}`);
}

for (const ruleId of ruleIds) {
  assertIncludes(guide, `\`${ruleId}\``, paths.guide);
  assertIncludes(detectorsIndex, `"${ruleId}"`, paths.detectorsIndex);
}

const orderMatch = detectorsIndex.match(/DEFAULT_DETECTOR_RULE_ORDER\s*=\s*\[([\s\S]*?)\]\s+as const/u);
if (!orderMatch) {
  fail("detectors/index.ts must define DEFAULT_DETECTOR_RULE_ORDER");
}

const orderedRuleIds = Array.from(orderMatch[1].matchAll(/"([^"]+)"/gu)).map((match) => match[1]);
const duplicatedOrderIds = orderedRuleIds.filter((ruleId, index) => orderedRuleIds.indexOf(ruleId) !== index);
if (duplicatedOrderIds.length > 0) {
  fail(`DEFAULT_DETECTOR_RULE_ORDER must not include duplicates: ${[...new Set(duplicatedOrderIds)].join(", ")}`);
}

const sortedRuleIds = [...ruleIds].sort();
const sortedOrderedRuleIds = [...orderedRuleIds].sort();
if (JSON.stringify(sortedRuleIds) !== JSON.stringify(sortedOrderedRuleIds)) {
  const missingFromOrder = ruleIds.filter((ruleId) => !orderedRuleIds.includes(ruleId));
  const unknownInOrder = orderedRuleIds.filter((ruleId) => !ruleIds.includes(ruleId));
  fail(
    `category detector rules and DEFAULT_DETECTOR_RULE_ORDER must match. missingFromOrder=${missingFromOrder.join(", ")} unknownInOrder=${unknownInOrder.join(", ")}`
  );
}

for (const phrase of ["createOrderedDetectorRules", "DEFAULT_DETECTOR_RULE_ORDER"]) {
  assertIncludes(rulesSource + detectorsIndex, phrase, "bundled detector rule wiring");
}

const placeholderPairs = Array.from(helperSource.matchAll(/\s([a-z0-9_]+):\s*"([A-Z0-9_]+)"/gu));
if (placeholderPairs.length < ruleIds.length) {
  fail("placeholderByRuleId appears to be missing entries");
}

for (const [, ruleId, prefix] of placeholderPairs) {
  assertIncludes(guide, `\`${ruleId}\``, paths.guide);
  assertIncludes(guide, `[${prefix}_1]`, paths.guide);
}

for (const phrase of [
  "RemoteDetectorRuleDefinition",
  "remote:<id>",
  "detectSensitiveText(input, { extraRules })",
  "placeholderPrefix",
  "riskLevel",
  "category",
  "message",
  "confidence",
  "schema",
  "payload.version",
  "generatedAt",
  "minExtensionVersion",
  "ReDoS",
  "誤検出",
  "過検出",
  "ロールバック",
  "署名付き配信前レビュー",
  "pnpm qa:rule-catalog",
  "pnpm test:core",
  "pnpm test:worker",
  "ユーザー本文",
  "実secret",
  "同梱ルールへフォールバック",
  "packages/core/src/detectors/",
  "DEFAULT_DETECTOR_RULE_ORDER"
]) {
  assertIncludes(guide, phrase, paths.guide);
}

for (const field of ["id", "label", "riskLevel", "category", "placeholderPrefix", "pattern", "flags", "message", "confidence", "enabled"]) {
  assertIncludes(remoteSchema, field, paths.remoteSchema);
  assertIncludes(guide, field, paths.guide);
}

for (const phrase of [
  "deliveryStatus",
  "paused",
  "同梱ルールへフォールバック"
]) {
  assertIncludes(remoteSchema + guide + ruleDelivery + operations, phrase, "remote rule delivery status docs");
}

for (const phrase of [
  "DLP評価fixture",
  "false_positive",
  "false negative",
  "リモートルール",
  "同梱ルール",
  "実APIキー",
  "pnpm eval:dlp",
  "pnpm qa:public-repo"
]) {
  assertIncludes(qualityProcess, phrase, paths.qualityProcess);
  assertIncludes(readme + guide + operations, "dlp-rule-quality-process.md", "rule quality process links");
}

for (const phrase of ["detection-rule-authoring.md", "検出ルール作成ガイド"]) {
  assertIncludes(ruleDelivery, phrase, paths.ruleDelivery);
  assertIncludes(operations, phrase, paths.operations);
  assertIncludes(readme, phrase, paths.readme);
}

console.log("Rule catalog QA passed");
