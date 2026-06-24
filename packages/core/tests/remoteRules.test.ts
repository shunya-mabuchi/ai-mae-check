import { describe, expect, it } from "vitest";
import {
  detectSensitiveText,
  signRemoteRuleBundle,
  verifySignedRemoteRuleBundle,
  type RemoteRulePublicKey,
  type RemoteRuleBundlePayload,
  type SignedRemoteRuleBundle
} from "../src";

const keyId = "test-rules-key-2026";

async function createKeyPair() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);

  return { privateJwk, publicJwk };
}

function samplePayload(): RemoteRuleBundlePayload {
  return {
    schemaVersion: 1,
    version: "2026.06.16.1",
    generatedAt: "2026-06-16T00:00:00.000Z",
    minExtensionVersion: "0.1.0",
    rules: [
      {
        id: "slack_webhook_url",
        label: "Slack webhook URL風文字列",
        riskLevel: "high",
        category: "secret",
        placeholderPrefix: "WEBHOOK_URL",
        pattern: "https://hooks\\.slack\\.com/services/[A-Za-z0-9/_-]+",
        flags: "g",
        message: "Webhook URLは外部へ送る前に確認したい秘密情報です。",
        confidence: 0.96
      }
    ]
  };
}

describe("signed remote rules", () => {
  it("署名付きルールバンドルを検証して追加DetectorRuleとして使える", async () => {
    const { privateJwk, publicJwk } = await createKeyPair();
    const signed = await signRemoteRuleBundle(samplePayload(), privateJwk, keyId);
    const result = await verifySignedRemoteRuleBundle(signed, publicJwk, { expectedKeyId: keyId });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const detection = detectSensitiveText("通知先は https://hooks.slack.com/services/T000/B000/XXX です。", {
      extraRules: result.rules
    });

    expect(detection.findings[0]?.ruleId).toBe("remote:slack_webhook_url");
    expect(detection.findings[0]?.placeholder).toBe("[WEBHOOK_URL_1]");
  });

  it("payloadが改ざんされた署名付きルールは検証に失敗する", async () => {
    const { privateJwk, publicJwk } = await createKeyPair();
    const signed = await signRemoteRuleBundle(samplePayload(), privateJwk, keyId);
    const tampered: SignedRemoteRuleBundle = {
      ...signed,
      payload: {
        ...signed.payload,
        version: "2026.06.16.tampered"
      }
    };

    const result = await verifySignedRemoteRuleBundle(tampered, publicJwk, { expectedKeyId: keyId });

    expect(result.ok).toBe(false);
  });

  it("鍵IDが違うルールバンドルは使わない", async () => {
    const { privateJwk, publicJwk } = await createKeyPair();
    const signed = await signRemoteRuleBundle(samplePayload(), privateJwk, keyId);
    const result = await verifySignedRemoteRuleBundle(signed, publicJwk, { expectedKeyId: "another-key" });

    expect(result.ok).toBe(false);
  });

  it("複数の公開鍵からkeyIdに一致する鍵で検証できる", async () => {
    const oldKey = await createKeyPair();
    const newKey = await createKeyPair();
    const unknownKey = await createKeyPair();
    const oldKeyId = "test-rules-key-old";
    const newKeyId = "test-rules-key-new";
    const publicKeys: RemoteRulePublicKey[] = [
      { keyId: oldKeyId, publicJwk: oldKey.publicJwk },
      { keyId: newKeyId, publicJwk: newKey.publicJwk }
    ];

    const oldSigned = await signRemoteRuleBundle(samplePayload(), oldKey.privateJwk, oldKeyId);
    const newSigned = await signRemoteRuleBundle(samplePayload(), newKey.privateJwk, newKeyId);
    const unknownSigned = await signRemoteRuleBundle(samplePayload(), unknownKey.privateJwk, "test-rules-key-unknown");
    const tampered: SignedRemoteRuleBundle = {
      ...newSigned,
      payload: {
        ...newSigned.payload,
        version: "2026.06.16.tampered"
      }
    };

    await expect(verifySignedRemoteRuleBundle(oldSigned, publicKeys)).resolves.toMatchObject({ ok: true });
    await expect(verifySignedRemoteRuleBundle(newSigned, publicKeys)).resolves.toMatchObject({ ok: true });
    await expect(verifySignedRemoteRuleBundle(unknownSigned, publicKeys)).resolves.toMatchObject({ ok: false });
    await expect(verifySignedRemoteRuleBundle(tampered, publicKeys)).resolves.toMatchObject({ ok: false });
  });

  it("検証済みルールを渡さなければ同梱ルールだけで検出する", () => {
    const detection = detectSensitiveText("通知先は https://hooks.slack.com/services/T000/B000/XXX です。");

    expect(detection.findings.some((finding) => finding.ruleId === "remote:slack_webhook_url")).toBe(false);
  });
});
