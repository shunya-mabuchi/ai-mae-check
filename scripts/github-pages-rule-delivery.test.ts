import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  signRemoteRuleBundle,
  validateRemoteRuleBundlePayload,
  verifySignedRemoteRuleBundle
} from "../packages/core/src";
import { signGithubPagesRules } from "./sign-github-pages-rules";

const rootDir = resolve(__dirname, "..");

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(resolve(rootDir, relativePath), "utf8")) as unknown;
}

async function createKeyPair() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return {
    privateJwk: await crypto.subtle.exportKey("jwk", pair.privateKey),
    publicJwk: await crypto.subtle.exportKey("jwk", pair.publicKey)
  };
}

describe("GitHub Pages署名付きルール配信", () => {
  it("Git管理されたルールJSONがschemaを満たす", () => {
    const payload = validateRemoteRuleBundlePayload(readJson("rules/latest.json"));

    expect(payload).not.toBeNull();
    expect(payload?.deliveryStatus).toBe("active");
    expect(payload?.minExtensionVersion).toBe("0.1.2");
    expect(payload?.rules).toHaveLength(1);
  });

  it("ビルド時に署名したJSONを公開鍵で検証できる", async () => {
    const payload = validateRemoteRuleBundlePayload(readJson("rules/latest.json"));
    const { privateJwk, publicJwk } = await createKeyPair();

    expect(payload).not.toBeNull();
    if (!payload) {
      return;
    }

    const signed = await signRemoteRuleBundle(payload, privateJwk, "test-github-pages-key");
    const result = await verifySignedRemoteRuleBundle(signed, publicJwk, {
      expectedKeyId: "test-github-pages-key",
      now: () => Date.parse("2026-07-29T01:00:00.000Z")
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.version).toBe("2026.07.29.1");
      expect(result.rules[0]?.id).toBe("remote:slack_webhook_url");
    }
  });

  it("公開用署名スクリプトが実ファイルへ検証可能なJSONを出力する", async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), "ai-mae-check-pages-"));
    const outputPath = resolve(temporaryDirectory, "api/rules/latest.json");
    const { privateJwk, publicJwk } = await createKeyPair();

    try {
      await signGithubPagesRules({
        sourcePath: resolve(rootDir, "rules/latest.json"),
        outputPath,
        keyId: "test-github-pages-script-key",
        privateJwkText: JSON.stringify(privateJwk)
      });

      const signed = JSON.parse(await readFile(outputPath, "utf8")) as unknown;
      const result = await verifySignedRemoteRuleBundle(signed, publicJwk, {
        expectedKeyId: "test-github-pages-script-key",
        now: () => Date.parse("2026-07-29T01:00:00.000Z")
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.payload.version).toBe("2026.07.29.1");
      }
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("拡張の公開設定には秘密鍵を含めない", () => {
    const releaseConfig = readJson("apps/extension/config/rule-delivery.release.json") as Record<string, unknown>;
    const serialized = JSON.stringify(releaseConfig);

    expect(releaseConfig.endpoint).toBe(
      "https://shunya-mabuchi.github.io/ai-mae-check/api/rules/latest.json"
    );
    expect(releaseConfig.keyId).toBe("ai-mae-check-rules-2026-07-v3");
    expect(serialized).not.toContain('"d"');
  });
});
