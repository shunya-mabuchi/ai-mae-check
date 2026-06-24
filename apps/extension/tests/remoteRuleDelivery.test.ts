import { describe, expect, it, vi } from "vitest";
import {
  signRemoteRuleBundle,
  type RemoteRuleBundlePayload,
  type RemoteRulePublicKey,
  type SignedRemoteRuleBundle
} from "@ai-mae-check/core";
import releaseConfig from "../config/rule-delivery.release.json";
import {
  REMOTE_RULE_CACHE_TTL_MS,
  RULE_DELIVERY_KEY_ID,
  RULE_DELIVERY_PUBLIC_JWK,
  RULE_DELIVERY_PUBLIC_KEYS,
  loadVerifiedRemoteRules
} from "../src/lib/remoteRuleDelivery";
import type { RemoteRuleCacheStore, VerifiedRemoteRuleCacheEntry } from "../src/lib/remoteRuleCache";

const keyId = "extension-test-key";
const validBundleNow = Date.parse("2026-06-16T00:10:00.000Z");

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
    expiresAt: "2026-06-16T00:30:00.000Z",
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

function createMemoryCache(initialEntry: VerifiedRemoteRuleCacheEntry | null = null): RemoteRuleCacheStore & {
  entry: VerifiedRemoteRuleCacheEntry | null;
} {
  let entry = initialEntry;

  return {
    get entry() {
      return entry;
    },
    async read() {
      return entry;
    },
    async write(nextEntry) {
      entry = nextEntry;
    },
    async clear() {
      entry = null;
    }
  };
}

describe("loadVerifiedRemoteRules", () => {
  it("uses the checked-in release public key config", () => {
    expect(RULE_DELIVERY_KEY_ID).toBe(releaseConfig.keyId);
    expect(RULE_DELIVERY_PUBLIC_JWK).toEqual(releaseConfig.publicJwk);
    expect(RULE_DELIVERY_PUBLIC_KEYS[0]).toEqual({
      keyId: releaseConfig.keyId,
      publicJwk: releaseConfig.publicJwk
    });
  });

  it("fetches the signed bundle with GET and without a body", async () => {
    const { privateJwk, publicJwk } = await createKeyPair();
    const signed = await signRemoteRuleBundle(payload(), privateJwk, keyId);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(signed), { status: 200 }));

    const result = await loadVerifiedRemoteRules({
      endpoint: "https://rules.example.test/api/rules/latest",
      publicJwk,
      expectedKeyId: keyId,
      fetcher,
      now: () => validBundleNow
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

  it("verifies a bundle signed with any configured public key", async () => {
    const oldKey = await createKeyPair();
    const newKey = await createKeyPair();
    const publicKeys: RemoteRulePublicKey[] = [
      { keyId: "extension-test-old-key", publicJwk: oldKey.publicJwk },
      { keyId: "extension-test-new-key", publicJwk: newKey.publicJwk }
    ];
    const signed = await signRemoteRuleBundle(payload(), newKey.privateJwk, "extension-test-new-key");
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(signed), { status: 200 }));

    const result = await loadVerifiedRemoteRules({
      endpoint: "https://rules.example.test/api/rules/latest",
      publicKeys,
      fetcher,
      now: () => validBundleNow
    });

    expect(result.status).toBe("verified");
    expect(result.rules).toHaveLength(1);
  });

  it("caches only verified signed bundles and reuses them for a short HTTP failure", async () => {
    const { privateJwk, publicJwk } = await createKeyPair();
    const signed = await signRemoteRuleBundle(payload(), privateJwk, keyId);
    const cacheStore = createMemoryCache();
    const now = Date.parse("2026-06-16T00:10:00.000Z");
    const okFetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(signed), { status: 200 }));

    const verified = await loadVerifiedRemoteRules({
      endpoint: "https://rules.example.test/api/rules/latest",
      publicJwk,
      expectedKeyId: keyId,
      fetcher: okFetcher,
      cacheStore,
      now: () => now
    });

    expect(verified.status).toBe("verified");
    expect(cacheStore.entry).toMatchObject({
      keyId,
      version: payload().version,
      generatedAt: payload().generatedAt,
      cachedAt: now,
      expiresAt: Date.parse(payload().expiresAt ?? "")
    });

    const failingFetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 503 }));
    const cached = await loadVerifiedRemoteRules({
      endpoint: "https://rules.example.test/api/rules/latest",
      publicJwk,
      expectedKeyId: keyId,
      fetcher: failingFetcher,
      cacheStore,
      now: () => now + 1
    });

    expect(cached.status).toBe("cached");
    expect(cached.rules).toHaveLength(1);
  });

  it("does not use expired or tampered cached bundles", async () => {
    const { privateJwk, publicJwk } = await createKeyPair();
    const signed = await signRemoteRuleBundle(payload(), privateJwk, keyId);
    const expiredCache = createMemoryCache({
      bundle: signed,
      keyId,
      version: signed.payload.version,
      generatedAt: signed.payload.generatedAt,
      cachedAt: 1_000,
      expiresAt: 1_500
    });
    const failingFetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("network error"));

    const expired = await loadVerifiedRemoteRules({
      endpoint: "https://rules.example.test/api/rules/latest",
      publicJwk,
      expectedKeyId: keyId,
      fetcher: failingFetcher,
      cacheStore: expiredCache,
      now: () => 2_000
    });

    expect(expired.status).toBe("fallback");
    expect(expiredCache.entry).toBeNull();

    const tamperedCache = createMemoryCache({
      bundle: {
        ...signed,
        payload: {
          ...signed.payload,
          version: "tampered"
        }
      },
      keyId,
      version: "tampered",
      generatedAt: signed.payload.generatedAt,
      cachedAt: 1_000,
      expiresAt: 10_000
    });

    const tampered = await loadVerifiedRemoteRules({
      endpoint: "https://rules.example.test/api/rules/latest",
      publicJwk,
      expectedKeyId: keyId,
      fetcher: failingFetcher,
      cacheStore: tamperedCache,
      now: () => 2_000
    });

    expect(tampered.status).toBe("fallback");
    expect(tamperedCache.entry).toBeNull();
  });

  it("falls back without caching when the signed bundle itself is expired", async () => {
    const { privateJwk, publicJwk } = await createKeyPair();
    const signed = await signRemoteRuleBundle(payload(), privateJwk, keyId);
    const cacheStore = createMemoryCache();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(signed), { status: 200 }));

    const result = await loadVerifiedRemoteRules({
      endpoint: "https://rules.example.test/api/rules/latest",
      publicJwk,
      expectedKeyId: keyId,
      fetcher,
      cacheStore,
      now: () => Date.parse("2026-06-16T00:31:00.000Z")
    });

    expect(result.status).toBe("fallback");
    expect(result.reason).toBe("ルールバンドルの有効期限が切れています");
    expect(cacheStore.entry).toBeNull();
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
      fetcher,
      now: () => validBundleNow
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
