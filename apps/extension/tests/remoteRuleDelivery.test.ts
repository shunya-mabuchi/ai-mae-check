import { describe, expect, it, vi } from "vitest";
import { signRemoteRuleBundle, type RemoteRuleBundlePayload, type SignedRemoteRuleBundle } from "@ai-mae-check/core";
import releaseConfig from "../config/rule-delivery.release.json";
import { RULE_DELIVERY_KEY_ID, RULE_DELIVERY_PUBLIC_JWK, loadVerifiedRemoteRules } from "../src/lib/remoteRuleDelivery";

const keyId = "extension-test-key";

async function createKeyPair() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);

  return { privateJwk, publicJwk };
}

function payload(): RemoteRuleBundlePayload {
  return {
    schemaVersion: 1,
    version: "2026.06.16.1",
    generatedAt: "2026-06-16T00:00:00.000Z",
    rules: [
      {
        id: "demo_secret_marker",
        label: "Demo secret marker",
        riskLevel: "high",
        category: "secret",
        placeholderPrefix: "DEMO_SECRET",
        pattern: "DEMO_SECRET_[A-Z0-9]+",
        flags: "g"
      }
    ]
  };
}

describe("loadVerifiedRemoteRules", () => {
  it("uses the checked-in release public key config", () => {
    expect(RULE_DELIVERY_KEY_ID).toBe(releaseConfig.keyId);
    expect(RULE_DELIVERY_PUBLIC_JWK).toEqual(releaseConfig.publicJwk);
  });

  it("fetches the signed bundle with GET and without a body", async () => {
    const { privateJwk, publicJwk } = await createKeyPair();
    const signed = await signRemoteRuleBundle(payload(), privateJwk, keyId);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(signed), { status: 200 }));

    const result = await loadVerifiedRemoteRules({
      endpoint: "https://rules.example.test/api/rules/latest",
      publicJwk,
      expectedKeyId: keyId,
      fetcher
    });

    expect(result.status).toBe("verified");
    expect(result.rules).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledWith(
      "https://rules.example.test/api/rules/latest",
      expect.objectContaining({
        method: "GET"
      })
    );
    expect(fetcher.mock.calls[0]?.[1]).not.toHaveProperty("body");
  });

  it("falls back when signature verification fails", async () => {
    const { privateJwk, publicJwk } = await createKeyPair();
    const signed = await signRemoteRuleBundle(payload(), privateJwk, keyId);
    const tampered: SignedRemoteRuleBundle = {
      ...signed,
      payload: {
        ...signed.payload,
        version: "tampered"
      }
    };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(tampered), { status: 200 }));

    const result = await loadVerifiedRemoteRules({
      endpoint: "https://rules.example.test/api/rules/latest",
      publicJwk,
      expectedKeyId: keyId,
      fetcher
    });

    expect(result.status).toBe("fallback");
    expect(result.rules).toEqual([]);
  });

  it("stays disabled when no endpoint is configured", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const result = await loadVerifiedRemoteRules({ endpoint: "", fetcher });

    expect(result.status).toBe("disabled");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
