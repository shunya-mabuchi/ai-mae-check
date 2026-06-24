import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");

const paths = {
  docs: "docs/performance-budget.md",
  readme: "README.md",
  packageJson: "package.json",
  llmConstants: "packages/llm/src/constants.ts",
  bridgeFrame: "apps/extension/src/lib/llmBridgeFrame.ts"
};

function fail(message) {
  throw new Error(`performance budget QA failed: ${message}`);
}

function read(relativePath) {
  return readFileSync(resolve(rootDir, relativePath), "utf8");
}

function assertIncludes(text, needle, context) {
  if (!text.includes(needle)) {
    fail(`${context} must include: ${needle}`);
  }
}

function assertNotIncludes(text, needle, context) {
  if (text.includes(needle)) {
    fail(`${context} must not include stale phrase: ${needle}`);
  }
}

for (const path of Object.values(paths)) {
  if (!existsSync(resolve(rootDir, path))) {
    fail(`${path} is missing`);
  }
}

const docs = read(paths.docs);
const readme = read(paths.readme);
const packageJson = JSON.parse(read(paths.packageJson));
const llmConstants = read(paths.llmConstants);
const bridgeFrame = read(paths.bridgeFrame);

for (const phrase of [
  "ルールベース検出",
  "100ms以内",
  "250ms以内",
  "モーダル表示はWebLLMのモデルロードや推論完了を待たない",
  "WebLLMは追加の文脈候補を出す補助機能",
  "最大6,000文字",
  "最大12件",
  "最大80文字",
  "ContextBuilder",
  "15秒以内",
  "実ユーザー本文",
  "placeholderMap",
  "console.log",
  "pnpm bench:rules",
  "pnpm qa:performance-budget"
]) {
  assertIncludes(docs, phrase, paths.docs);
}

for (const phrase of ["今後 `WebLLM準備済み時だけ自動実行する`", "将来の `ContextBuilder`"]) {
  assertNotIncludes(docs, phrase, paths.docs);
}

for (const phrase of [
  "DEFAULT_MAX_INPUT_CHARS = 6000",
  "DEFAULT_MAX_CANDIDATES = 12",
  "MAX_CONTEXT_SURFACE_CHARS = 80"
]) {
  assertIncludes(llmConstants, phrase, paths.llmConstants);
}

assertIncludes(bridgeFrame, "BRIDGE_LOAD_TIMEOUT_MS = 15000", paths.bridgeFrame);
assertIncludes(readme, "docs/performance-budget.md", paths.readme);

if (packageJson.scripts?.["qa:performance-budget"] !== "node scripts/check-performance-budget-doc.mjs") {
  fail("package.json must define qa:performance-budget");
}

if (!packageJson.scripts?.["bench:rules"]?.includes("scripts/bench-rule-detection.test.ts")) {
  fail("package.json must define bench:rules");
}

console.log("performance budget QA passed");
