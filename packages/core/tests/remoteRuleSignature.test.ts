import { describe, expect, it } from "vitest";
import { REMOTE_RULE_SIGNATURE_ALG, type RemoteRuleBundlePayload } from "../src";
import {
  base64UrlToBytes,
  bytesToBase64Url,
  createRemoteRuleSigningTarget,
  toArrayBuffer
} from "../src/remoteRuleSignature";

function samplePayload(): RemoteRuleBundlePayload {
  return {
    schemaVersion: 1,
    version: "2026.06.17.1",
    generatedAt: "2026-06-17T00:00:00.000Z",
    expiresAt: "2026-07-17T00:00:00.000Z",
    minExtensionVersion: undefined,
    rules: [
      {
        pattern: "dummy_[A-Za-z0-9]+",
        placeholderPrefix: "DUMMY",
        riskLevel: "high",
        label: "ダミールール",
        id: "dummy_secret"
      }
    ]
  };
}

describe("remoteRuleSignature", () => {
  it("署名対象文字列はキー順に依存せず、undefinedを含めない", () => {
    const payload = samplePayload();
    const samePayloadWithDifferentOrder = {
      rules: payload.rules.map((rule) => ({
        id: rule.id,
        label: rule.label,
        riskLevel: rule.riskLevel,
        placeholderPrefix: rule.placeholderPrefix,
        pattern: rule.pattern
      })),
      expiresAt: payload.expiresAt,
      generatedAt: payload.generatedAt,
      version: payload.version,
      schemaVersion: payload.schemaVersion,
      minExtensionVersion: undefined
    } satisfies RemoteRuleBundlePayload;

    const first = createRemoteRuleSigningTarget({
      alg: REMOTE_RULE_SIGNATURE_ALG,
      keyId: "test-key",
      payload
    });
    const second = createRemoteRuleSigningTarget({
      payload: samePayloadWithDifferentOrder,
      keyId: "test-key",
      alg: REMOTE_RULE_SIGNATURE_ALG
    });

    expect(first).toBe(second);
    expect(first).not.toContain("undefined");
    expect(first.indexOf("\"alg\"")).toBeLessThan(first.indexOf("\"keyId\""));
    expect(first.indexOf("\"keyId\"")).toBeLessThan(first.indexOf("\"payload\""));
  });

  it("base64urlへ変換した署名バイト列を復元できる", () => {
    const bytes = new Uint8Array([0, 251, 255, 238, 1, 2, 3]);
    const encoded = bytesToBase64Url(toArrayBuffer(bytes));

    expect(encoded).not.toMatch(/[+/=]/u);
    expect(Array.from(base64UrlToBytes(encoded))).toEqual(Array.from(bytes));
  });
});
