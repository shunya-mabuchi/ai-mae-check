import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");
const constantsPath = resolve(rootDir, "packages/llm/src/constants.ts");
const policyPath = resolve(rootDir, "docs/webllm-model-policy.md");
const readmePath = resolve(rootDir, "README.md");
const licensePolicyPath = resolve(rootDir, "docs/license-policy.md");

function fail(message) {
  throw new Error(`WebLLM model policy QA failed: ${message}`);
}

function read(path) {
  return readFileSync(path, "utf8");
}

function extractConst(source, name) {
  const match = source.match(new RegExp(`export const ${name} = "([^"]+)";`));
  if (!match) {
    fail(`Cannot find ${name} in packages/llm/src/constants.ts`);
  }
  return match[1];
}

function assertIncludes(text, needle, context) {
  if (!text.includes(needle)) {
    fail(`${context} must include: ${needle}`);
  }
}

const constants = read(constantsPath);
const policy = read(policyPath);
const readme = read(readmePath);
const licensePolicy = read(licensePolicyPath);

const defaultModelId = extractConst(constants, "DEFAULT_MODEL_ID");

for (const doc of [
  ["docs/webllm-model-policy.md", policy],
  ["README.md", readme]
]) {
  assertIncludes(doc[1], defaultModelId, doc[0]);
}

assertIncludes(policy, "Llama 3.2 Community License", "docs/webllm-model-policy.md");
assertIncludes(policy, "単一モデル", "docs/webllm-model-policy.md");
assertIncludes(policy, "context window", "docs/webllm-model-policy.md");
assertIncludes(policy, "prebuiltAppConfig.model_list", "docs/webllm-model-policy.md");
assertIncludes(policy, "外部LLM API", "docs/webllm-model-policy.md");
assertIncludes(policy, "ユーザー本文", "docs/webllm-model-policy.md");
assertIncludes(policy, "https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct", "docs/webllm-model-policy.md");
assertIncludes(policy, "https://github.com/mlc-ai/web-llm", "docs/webllm-model-policy.md");

assertIncludes(licensePolicy, "第三者モデル", "docs/license-policy.md");
assertIncludes(licensePolicy, "ライセンス", "docs/license-policy.md");

console.log("WebLLM model policy QA passed");
