import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { signRemoteRuleBundle, validateRemoteRuleBundlePayload } from "../packages/core/src";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export interface SignGithubPagesRulesOptions {
  sourcePath?: string;
  outputPath?: string;
  legacyOutputPath?: string | null;
  keyId?: string;
  privateJwkText?: string;
}

export async function signGithubPagesRules(options: SignGithubPagesRulesOptions = {}) {
  const sourcePath = options.sourcePath ?? resolve(repositoryRoot, "rules/latest.json");
  const outputPath = options.outputPath ?? resolve(repositoryRoot, "apps/demo/dist/rules/latest.json");
  const legacyOutputPath = options.legacyOutputPath === undefined
    ? options.outputPath
      ? null
      : resolve(repositoryRoot, "apps/demo/dist/api/rules/latest.json")
    : options.legacyOutputPath;
  const keyId = options.keyId?.trim() || process.env.RULE_KEY_ID?.trim();
  const privateJwkText = options.privateJwkText ?? process.env.RULE_SIGNING_PRIVATE_JWK;

  if (!keyId) {
    throw new Error("RULE_KEY_IDが設定されていません");
  }

  if (!privateJwkText) {
    throw new Error("RULE_SIGNING_PRIVATE_JWKが設定されていません");
  }

  const sourceJson = JSON.parse(await readFile(sourcePath, "utf8")) as unknown;
  const payload = validateRemoteRuleBundlePayload(sourceJson);
  if (!payload) {
    throw new Error("ルール配信元JSONの形式が不正です");
  }

  let privateJwk: JsonWebKey;
  try {
    privateJwk = JSON.parse(privateJwkText) as JsonWebKey;
  } catch {
    throw new Error("RULE_SIGNING_PRIVATE_JWKをJSONとして読み取れません");
  }

  const signedBundle = await signRemoteRuleBundle(payload, privateJwk, keyId);
  const serializedBundle = `${JSON.stringify(signedBundle, null, 2)}\n`;
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serializedBundle, "utf8");

  if (legacyOutputPath && resolve(legacyOutputPath) !== resolve(outputPath)) {
    await mkdir(dirname(legacyOutputPath), { recursive: true });
    await writeFile(legacyOutputPath, serializedBundle, "utf8");
  }

  return { outputPath, legacyOutputPath, signedBundle };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const { outputPath, legacyOutputPath, signedBundle } = await signGithubPagesRules();
  console.log(JSON.stringify({
    ok: true,
    keyId: signedBundle.keyId,
    version: signedBundle.payload.version,
    ruleCount: signedBundle.payload.rules.length,
    output: outputPath,
    legacyOutput: legacyOutputPath
  }));
}
