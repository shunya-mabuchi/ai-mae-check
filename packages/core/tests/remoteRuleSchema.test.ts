import { describe, expect, it } from "vitest";
import {
  REMOTE_RULE_BUNDLE_SCHEMA_VERSION,
  validateRemoteRuleBundlePayload,
  type RemoteRuleBundlePayload
} from "../src/remoteRuleSchema";

function validPayload(): RemoteRuleBundlePayload {
  return {
    schemaVersion: REMOTE_RULE_BUNDLE_SCHEMA_VERSION,
    version: "2026.06.17.1",
    generatedAt: "2026-06-17T00:00:00.000Z",
    rules: [
      {
        id: "sample_secret",
        label: "サンプル秘密情報",
        riskLevel: "high",
        category: "secret",
        placeholderPrefix: "SAMPLE_SECRET",
        pattern: "sample_[A-Za-z0-9]+",
        flags: "gi",
        confidence: 0.95
      }
    ]
  };
}

describe("remoteRuleSchema", () => {
  it("署名対象payloadを検証して正規化する", () => {
    const payload = validPayload();

    expect(validateRemoteRuleBundlePayload(payload)).toEqual(payload);
  });

  it("危険な正規表現flagsを含むルールは拒否する", () => {
    const payload = validPayload();
    payload.rules[0].flags = "gix";

    expect(validateRemoteRuleBundlePayload(payload)).toBeNull();
  });
});
