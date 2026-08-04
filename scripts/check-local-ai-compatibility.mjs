import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");
const paths = {
  constants: "packages/llm/src/constants.ts",
  matrix: "docs/webllm-compatibility-matrix.md",
  realDevice: "docs/webllm-real-device-check.md",
  recovery: "docs/webllm-error-recovery.md",
  modelPolicy: "docs/webllm-model-policy.md",
  readme: "README.md",
  llmPackage: "packages/llm/package.json"
};

function fail(message) {
  throw new Error(`ローカルAI互換性QAに失敗しました: ${message}`);
}

function read(relativePath) {
  return readFileSync(resolve(rootDir, relativePath), "utf8");
}

function assertIncludes(text, needle, context) {
  if (!text.includes(needle)) fail(`${context} に次の記述が必要です: ${needle}`);
}

for (const path of Object.values(paths)) {
  if (!existsSync(resolve(rootDir, path))) fail(`${path} がありません`);
}

const constants = read(paths.constants);
const matrix = read(paths.matrix);
const realDevice = read(paths.realDevice);
const recovery = read(paths.recovery);
const policy = read(paths.modelPolicy);
const readme = read(paths.readme);
const llmPackage = JSON.parse(read(paths.llmPackage));

const modelRequired = [
  "sirasagi62/ruri-v3-30m-ONNX",
  "jiting/xlm-roberta-ner-japanese_onnx",
  "Transformers.js",
  "ONNX Runtime Web",
  "CPU/WASM"
];

for (const [name, text] of [
  ["互換性マトリクス", matrix],
  ["実機確認", realDevice],
  ["復旧手順", recovery],
  ["モデル方針", policy],
  ["README", readme]
]) {
  for (const phrase of modelRequired) assertIncludes(text, phrase, name);
}

for (const phrase of ["model_fetch", "storage", "memory", "worker", "wasm", "timeout", "ルールベース検出"]) {
  for (const [name, text] of [["互換性マトリクス", matrix], ["実機確認", realDevice], ["復旧手順", recovery]]) {
    assertIncludes(text, phrase, name);
  }
}

assertIncludes(constants, "LOCAL_CONTEXT_MODEL_ID", "モデル定数");
assertIncludes(constants, "LOCAL_NER_MODEL_ID", "モデル定数");
assertIncludes(llmPackage.dependencies?.["@huggingface/transformers"] ?? "", "3.", "Transformers.js依存関係");
assertIncludes(llmPackage.dependencies?.["onnxruntime-web"] ?? "", "1.", "ONNX Runtime Web依存関係");

for (const stale of ["Qwen2.5-0.5B-Instruct-q4f16_1-MLC", "Xenova/multilingual-e5-small", "No available WebGPU adapters", "json_parse"]) {
  for (const [name, text] of [["互換性マトリクス", matrix], ["実機確認", realDevice], ["復旧手順", recovery]]) {
    if (text.includes(stale)) fail(`${name} に古い記述が残っています: ${stale}`);
  }
}

console.log("ローカルAI互換性QAに合格しました");
