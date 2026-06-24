import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");

const paths = {
  matrix: "docs/webllm-compatibility-matrix.md",
  realDevice: "docs/webllm-real-device-check.md",
  modelPolicy: "docs/webllm-model-policy.md",
  readme: "README.md",
  supportPage: "apps/demo/src/components/SupportPage.tsx",
  llmPackage: "packages/llm/package.json"
};

function fail(message) {
  throw new Error(`WebLLM compatibility QA failed: ${message}`);
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
    fail(`${context} must not include stale placeholder: ${needle}`);
  }
}

for (const path of Object.values(paths)) {
  if (!existsSync(resolve(rootDir, path))) {
    fail(`${path} is missing`);
  }
}

const matrix = read(paths.matrix);
const realDevice = read(paths.realDevice);
const modelPolicy = read(paths.modelPolicy);
const readme = read(paths.readme);
const supportPage = read(paths.supportPage);
const llmPackage = JSON.parse(read(paths.llmPackage));

const webLlmVersion = llmPackage.dependencies?.["@mlc-ai/web-llm"];
if (!webLlmVersion) {
  fail("@mlc-ai/web-llm dependency is missing");
}

assertIncludes(matrix, `@mlc-ai/web-llm@${webLlmVersion}`, paths.matrix);

for (const phrase of [
  "Llama-3.2-1B-Instruct-q4f32_1-MLC",
  "SmolLM2-360M-Instruct-q4f32_1-MLC",
  "Windows NT 10.0.26200.8457",
  "Chrome/148.0.7778.180",
  "Intel UHD Graphics 620",
  "Windows",
  "macOS",
  "Linux",
  "通常ウィンドウ",
  "シークレットモード",
  "chrome://gpu",
  "Dawn Info",
  "No available WebGPU adapters",
  "QuotaExceededError",
  "TypeError: Failed to fetch",
  "Object has already been disposed",
  "GPUBuffer.mapAsync",
  "ユーザー本文",
  "実APIキー",
  "実トークン",
  "placeholderMap",
  "ルールベースの検出は引き続き利用できます",
  "本文を記録していないこと"
]) {
  assertIncludes(matrix, phrase, paths.matrix);
}

for (const stalePlaceholder of ["2026-06-xx", "Chrome xx"]) {
  assertNotIncludes(matrix, stalePlaceholder, paths.matrix);
}

for (const phrase of [
  "webllm-compatibility-matrix.md",
  "ユーザー本文",
  "実APIキー",
  "実トークン",
  "placeholderMap"
]) {
  assertIncludes(realDevice, phrase, paths.realDevice);
}

for (const phrase of [
  "WebLLM対応環境",
  "webllm-compatibility-matrix.md",
  "WebLLMの実機確認"
]) {
  assertIncludes(readme, phrase, paths.readme);
}

assertIncludes(modelPolicy, "Llama-3.2-1B-Instruct-q4f32_1-MLC", paths.modelPolicy);
assertIncludes(modelPolicy, "SmolLM2-360M-Instruct-q4f32_1-MLC", paths.modelPolicy);
assertIncludes(supportPage, "WebLLM確認項目を見る", paths.supportPage);
assertIncludes(supportPage, "本文は記録しません", paths.supportPage);

console.log("WebLLM compatibility QA passed");
