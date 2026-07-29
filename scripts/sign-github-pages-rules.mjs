import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { signRemoteRuleBundle, validateRemoteRuleBundlePayload } from "../packages/core/dist/index.js";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(repositoryRoot, "rules/latest.json");
const outputPath = resolve(repositoryRoot, "apps/demo/dist/api/rules/latest.json");
const keyId = process.env.RULE_KEY_ID?.trim();
const privateJwkText = process.env.RULE_SIGNING_PRIVATE_JWK;

if (!keyId) {
  throw new Error("RULE_KEY_IDが設定されていません");
}

if (!privateJwkText) {
  throw new Error("RULE_SIGNING_PRIVATE_JWKが設定されていません");
}

const payload = validateRemoteRuleBundlePayload(JSON.parse(await readFile(sourcePath, "utf8")));
if (!payload) {
  throw new Error("ルール配信元JSONの形式が不正です");
}

let privateJwk;
try {
  privateJwk = JSON.parse(privateJwkText);
} catch {
  throw new Error("RULE_SIGNING_PRIVATE_JWKをJSONとして読み取れません");
}

const signedBundle = await signRemoteRuleBundle(payload, privateJwk, keyId);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(signedBundle, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  ok: true,
  keyId,
  version: signedBundle.payload.version,
  ruleCount: signedBundle.payload.rules.length,
  output: "apps/demo/dist/api/rules/latest.json"
}));
