import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");

const protectedRoots = [
  "apps/extension/entrypoints/",
  "apps/extension/src/",
  "packages/core/src/",
  "packages/llm/src/"
];

const paths = {
  packageJson: "package.json",
  ci: ".github/workflows/ci.yml",
  docs: "docs/privacy-regression.md",
  settings: "apps/extension/src/lib/settings.ts",
  remoteRuleCache: "apps/extension/src/lib/remoteRuleCache.ts",
  remoteRuleDelivery: "apps/extension/src/lib/remoteRuleDelivery.ts",
  remoteRuleBackground: "apps/extension/entrypoints/background.ts",
  pageSigner: "scripts/sign-github-pages-rules.mjs",
  ruleSource: "rules/latest.json"
};

const forbiddenPatterns = [
  {
    pattern: /\b(?:localStorage|sessionStorage|indexedDB)\b/u,
    detail: "runtime code must not use browser persistence for user body or findings"
  },
  {
    pattern: /\bconsole\.(?:log|debug|info|warn|error)\s*\(/u,
    detail: "runtime code must not write user body or findings to console"
  },
  {
    pattern: /\bnavigator\.sendBeacon\s*\(/u,
    detail: "runtime code must not use beacon-style outbound transmission"
  },
  {
    pattern: /\bnew\s+XMLHttpRequest\s*\(/u,
    detail: "runtime code must not add unreviewed XMLHttpRequest transport"
  },
  {
    pattern: /\bnew\s+FormData\s*\(/u,
    detail: "runtime code must not add form upload transport"
  }
];

function fail(message) {
  throw new Error(`privacy regression QA failed: ${message}`);
}

function read(relativePath) {
  return readFileSync(resolve(rootDir, relativePath), "utf8");
}

function trackedFiles() {
  return execFileSync("git", ["ls-files"], { encoding: "utf8" })
    .split(/\r?\n/u)
    .map((file) => file.trim().replace(/\\/gu, "/"))
    .filter(Boolean);
}

function isProtectedRuntimeFile(file) {
  return protectedRoots.some((root) => file.startsWith(root)) && /\.(?:ts|tsx|js|mjs)$/u.test(file);
}

function findLines(file, pattern) {
  return read(file)
    .split(/\r?\n/u)
    .flatMap((line, index) => (pattern.test(line) ? [{ line: index + 1, text: line.trim() }] : []));
}

function assertIncludes(text, needle, context) {
  if (!text.includes(needle)) {
    fail(`${context} must include: ${needle}`);
  }
}

for (const path of Object.values(paths)) {
  if (!existsSync(resolve(rootDir, path))) {
    fail(`${path} is missing`);
  }
}

const findings = [];

for (const file of trackedFiles().filter(isProtectedRuntimeFile)) {
  for (const { pattern, detail } of forbiddenPatterns) {
    for (const match of findLines(file, pattern)) {
      findings.push({ file, line: match.line, detail, text: match.text });
    }
  }
}

const storageAccessPattern = /chrome\.storage\.local\.(?:get|set|remove|clear)\s*\(/u;
const allowedStorageFiles = new Set([paths.settings, paths.remoteRuleCache]);
for (const file of trackedFiles().filter(isProtectedRuntimeFile)) {
  for (const match of findLines(file, storageAccessPattern)) {
    if (!allowedStorageFiles.has(file)) {
      findings.push({
        file,
        line: match.line,
        detail: "chrome.storage.local access must stay limited to settings and verified remote rule cache",
        text: match.text
      });
    }
  }
}

const settingsSource = read(paths.settings);
assertIncludes(settingsSource, 'export const SETTINGS_KEY = "ai-mae-check.settings.v1"', paths.settings);
assertIncludes(settingsSource, "export const SETTINGS_SCHEMA_VERSION", paths.settings);
assertIncludes(settingsSource, "chrome.storage.local.get(SETTINGS_KEY", paths.settings);
assertIncludes(settingsSource, "chrome.storage.local.set({ [SETTINGS_KEY]: normalizedSettings }", paths.settings);
assertIncludes(settingsSource, "chrome.storage.local.remove([SETTINGS_KEY, REMOTE_RULE_CACHE_KEY]", paths.settings);

const remoteRuleCacheSource = read(paths.remoteRuleCache);
assertIncludes(remoteRuleCacheSource, 'export const REMOTE_RULE_CACHE_KEY = "ai-mae-check.remoteRules.v1"', paths.remoteRuleCache);
assertIncludes(remoteRuleCacheSource, "chrome.storage.local.get(REMOTE_RULE_CACHE_KEY", paths.remoteRuleCache);
assertIncludes(remoteRuleCacheSource, "chrome.storage.local.set({ [REMOTE_RULE_CACHE_KEY]: entry }", paths.remoteRuleCache);
assertIncludes(remoteRuleCacheSource, "chrome.storage.local.remove(REMOTE_RULE_CACHE_KEY", paths.remoteRuleCache);
for (const forbidden of ["pastedText", "inputText", "placeholderMap", "DetectionResult", "Finding[]"]) {
  if (remoteRuleCacheSource.includes(forbidden)) {
    fail(`${paths.remoteRuleCache} must not cache user body, findings, or placeholderMap: ${forbidden}`);
  }
}

const extensionFetchPattern = /\bfetch\s*\(/u;
const allowedExtensionFetchFiles = new Set([paths.remoteRuleDelivery, paths.remoteRuleBackground]);
for (const file of trackedFiles().filter((file) => file.startsWith("apps/extension/") && /\.(?:ts|tsx|js|mjs)$/u.test(file))) {
  for (const match of findLines(file, extensionFetchPattern)) {
    if (!allowedExtensionFetchFiles.has(file)) {
      findings.push({
        file,
        line: match.line,
        detail: "extension fetch must be reviewed; only signed remote rule GET is allowed",
        text: match.text
      });
    }
  }
}

const remoteRuleSource = read(paths.remoteRuleDelivery);
assertIncludes(remoteRuleSource, 'method: "GET"', paths.remoteRuleDelivery);
assertIncludes(remoteRuleSource, 'accept: "application/json"', paths.remoteRuleDelivery);
if (/\bbody\s*:/u.test(remoteRuleSource)) {
  fail(`${paths.remoteRuleDelivery} must not send a request body`);
}

const remoteRuleBackgroundSource = read(paths.remoteRuleBackground);
assertIncludes(remoteRuleBackgroundSource, 'method: "GET"', paths.remoteRuleBackground);
assertIncludes(remoteRuleBackgroundSource, "message.endpoint !== RULE_DELIVERY_ENDPOINT", paths.remoteRuleBackground);
const backgroundFetchOptions = remoteRuleBackgroundSource.match(
  /void fetch\(message\.endpoint,\s*(\{[\s\S]*?\})\)\.then/u
)?.[1];
if (!backgroundFetchOptions) {
  fail(`${paths.remoteRuleBackground} must keep the reviewed fixed-endpoint fetch`);
}
if (/\bbody\s*:/u.test(backgroundFetchOptions)) {
  fail(`${paths.remoteRuleBackground} must not send a request body`);
}

const pageSignerSource = read(paths.pageSigner);
for (const forbidden of ["request.text(", "request.json(", "request.formData(", "request.arrayBuffer("]) {
  if (pageSignerSource.includes(forbidden)) {
    fail(`${paths.pageSigner} must not read an HTTP request body via ${forbidden}`);
  }
}

const packageJson = JSON.parse(read(paths.packageJson));
if (packageJson.scripts?.["qa:privacy-regression"] !== "node scripts/check-privacy-regression.mjs") {
  fail("package.json must define qa:privacy-regression");
}

const ci = read(paths.ci);
assertIncludes(ci, "pnpm qa:privacy-regression", paths.ci);

const docs = read(paths.docs);
for (const phrase of [
  "pnpm qa:privacy-regression",
  "chrome.storage.local",
  "検証済みの署名付きリモートルールキャッシュ",
  "console.log",
  "GET /api/rules/latest.json",
  "postMessage",
  "placeholderMap"
]) {
  assertIncludes(docs, phrase, paths.docs);
}

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.detail}: ${finding.text}`);
  }
  process.exit(1);
}

console.log("privacy regression QA passed");
