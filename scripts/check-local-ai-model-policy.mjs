import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");
const constantsPath = resolve(rootDir, "packages/llm/src/constants.ts");
const policyPath = resolve(rootDir, "docs/local-ai-model-policy.md");
const readmePath = resolve(rootDir, "README.md");
const noticePath = resolve(rootDir, "NOTICE");

function fail(message) {
  throw new Error(`ローカルAIモデル方針QAに失敗しました: ${message}`);
}

function read(path) {
  return readFileSync(path, "utf8");
}

function extractConst(source, name) {
  const match = source.match(new RegExp(`export const ${name} = "([^\"]+)";`));
  if (!match) fail(`packages/llm/src/constants.ts に ${name} がありません`);
  return match[1];
}

function assertIncludes(text, needle, context) {
  if (!text.includes(needle)) fail(`${context} に次の記述が必要です: ${needle}`);
}

function assertNotIncludes(text, needle, context) {
  if (text.includes(needle)) fail(`${context} に古い記述が残っています: ${needle}`);
}

const constants = read(constantsPath);
const policy = read(policyPath);
const readme = read(readmePath);
const notice = read(noticePath);
const contextModelId = extractConst(constants, "LOCAL_CONTEXT_MODEL_ID");
const contextRevision = extractConst(constants, "LOCAL_CONTEXT_MODEL_REVISION");
const nerModelId = extractConst(constants, "LOCAL_NER_MODEL_ID");
const nerRevision = extractConst(constants, "LOCAL_NER_MODEL_REVISION");

for (const [name, text] of [["モデル方針", policy], ["README", readme]]) {
  for (const value of [contextModelId, contextRevision, nerModelId, nerRevision]) {
    assertIncludes(text, value, name);
  }
  assertIncludes(text, "CPU/WASM", name);
  assertIncludes(text, "外部LLM API", name);
  assertIncludes(text, "ユーザー本文", name);
}

assertIncludes(policy, "Transformers.js", "モデル方針");
assertIncludes(policy, "ONNX Runtime Web", "モデル方針");
assertIncludes(policy, "Apache License 2.0", "モデル方針");
assertIncludes(policy, "MIT License", "モデル方針");
assertIncludes(notice, contextModelId, "NOTICE");
assertIncludes(notice, nerModelId, "NOTICE");
assertIncludes(notice, "Transformers.js", "NOTICE");
assertIncludes(notice, "ONNX Runtime Web", "NOTICE");

for (const text of [policy, readme]) {
  for (const stale of ["Qwen2.5-0.5B-Instruct-q4f16_1-MLC", "Xenova/multilingual-e5-small"]) {
    assertNotIncludes(text, stale, "現行モデル文書");
  }
}

console.log("ローカルAIモデル方針QAに合格しました");
