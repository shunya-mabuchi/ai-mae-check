import {
  verifySignedRemoteRuleBundle,
  type DetectorRule,
  type RemoteRulePublicKey,
  type RemoteRulePublicKeyInput,
  type RemoteRuleVerificationOptions,
  type RemoteRuleVerificationResult,
  type SignedRemoteRuleBundle
} from "@ai-mae-check/core";
import releaseConfig from "../../config/rule-delivery.release.json";
import {
  createChromeRemoteRuleCacheStore,
  type RemoteRuleCacheStore,
  type VerifiedRemoteRuleCacheEntry
} from "./remoteRuleCache";

interface RuleDeliveryReleaseConfig {
  endpoint?: string;
  keyId: string;
  publicJwk: JsonWebKey;
  publicKeys?: RemoteRulePublicKey[];
}

const typedReleaseConfig = releaseConfig as RuleDeliveryReleaseConfig;

export const RULE_DELIVERY_KEY_ID = typedReleaseConfig.keyId;

export const RULE_DELIVERY_PUBLIC_JWK: JsonWebKey = typedReleaseConfig.publicJwk;

export const RULE_DELIVERY_PUBLIC_KEYS: RemoteRulePublicKey[] =
  typedReleaseConfig.publicKeys && typedReleaseConfig.publicKeys.length > 0
    ? typedReleaseConfig.publicKeys
    : [{ keyId: RULE_DELIVERY_KEY_ID, publicJwk: RULE_DELIVERY_PUBLIC_JWK }];

export const REMOTE_RULE_CACHE_TTL_MS = 30 * 60 * 1000;

export type RemoteRuleLoadStatus = "disabled" | "verified" | "cached" | "fallback";

export interface RemoteRuleLoadResult {
  status: RemoteRuleLoadStatus;
  rules: DetectorRule[];
  version?: string;
  reason?: string;
}

export interface RemoteRuleDeliveryOptions {
  endpoint?: string;
  publicJwk?: JsonWebKey;
  publicKeys?: RemoteRulePublicKey[];
  expectedKeyId?: string;
  fetcher?: typeof fetch;
  cacheStore?: RemoteRuleCacheStore | null;
  cacheTtlMs?: number;
  now?: () => number;
}

type ImportMetaWithEnv = ImportMeta & {
  env?: {
    VITE_RULE_DELIVERY_URL?: string;
  };
};

function configuredEndpoint(): string {
  return ((import.meta as ImportMetaWithEnv).env?.VITE_RULE_DELIVERY_URL ?? "").trim();
}

function verificationKeyInput(options: RemoteRuleDeliveryOptions): RemoteRulePublicKeyInput {
  if (options.publicKeys && options.publicKeys.length > 0) {
    return options.publicKeys;
  }

  if (options.publicJwk) {
    return options.publicJwk;
  }

  return RULE_DELIVERY_PUBLIC_KEYS;
}

function verificationOptions(options: RemoteRuleDeliveryOptions, now?: number): RemoteRuleVerificationOptions {
  return {
    ...(options.expectedKeyId ? { expectedKeyId: options.expectedKeyId } : {}),
    now: () => now ?? options.now?.() ?? Date.now()
  };
}

function effectiveCacheExpiresAt(payloadExpiresAt: string | undefined, now: number, ttlMs: number): number {
  const ttlExpiresAt = now + ttlMs;
  if (!payloadExpiresAt) {
    return ttlExpiresAt;
  }

  return Math.min(ttlExpiresAt, Date.parse(payloadExpiresAt));
}

function resultFromVerification(
  result: RemoteRuleVerificationResult,
  status: Extract<RemoteRuleLoadStatus, "verified" | "cached">,
  reason?: string
): RemoteRuleLoadResult {
  if (!result.ok) {
    return {
      status: "fallback",
      rules: [],
      reason: result.reason
    };
  }

  return {
    status,
    rules: result.rules,
    version: result.payload.version,
    ...(reason ? { reason } : {})
  };
}

function createCacheEntry(
  bundle: SignedRemoteRuleBundle,
  result: Extract<RemoteRuleVerificationResult, { ok: true }>,
  now: number,
  ttlMs: number
): VerifiedRemoteRuleCacheEntry {
  return {
    bundle,
    keyId: bundle.keyId,
    version: result.payload.version,
    generatedAt: result.payload.generatedAt,
    cachedAt: now,
    expiresAt: effectiveCacheExpiresAt(result.payload.expiresAt, now, ttlMs)
  };
}

async function writeCache(
  cacheStore: RemoteRuleCacheStore | null | undefined,
  entry: VerifiedRemoteRuleCacheEntry
): Promise<void> {
  if (!cacheStore) {
    return;
  }

  try {
    await cacheStore.write(entry);
  } catch {
    // キャッシュ失敗でルール配信そのものを失敗扱いにしない。
  }
}

async function clearCache(cacheStore: RemoteRuleCacheStore | null | undefined): Promise<void> {
  if (!cacheStore) {
    return;
  }

  try {
    await cacheStore.clear();
  } catch {
    // キャッシュ削除失敗時も同梱ルールへのフォールバックは維持する。
  }
}

async function loadCachedVerifiedRemoteRules(
  options: RemoteRuleDeliveryOptions,
  reason: string
): Promise<RemoteRuleLoadResult | null> {
  const cacheStore = options.cacheStore ?? createChromeRemoteRuleCacheStore();
  if (!cacheStore) {
    return null;
  }

  let entry: VerifiedRemoteRuleCacheEntry | null = null;
  try {
    entry = await cacheStore.read();
  } catch {
    return null;
  }

  if (!entry) {
    return null;
  }

  const now = options.now?.() ?? Date.now();
  if (entry.expiresAt <= now) {
    await clearCache(cacheStore);
    return null;
  }

  const result = await verifySignedRemoteRuleBundle(entry.bundle, verificationKeyInput(options), verificationOptions(options, now));

  if (!result.ok) {
    await clearCache(cacheStore);
    return null;
  }

  if (entry.keyId !== entry.bundle.keyId || entry.version !== result.payload.version || entry.generatedAt !== result.payload.generatedAt) {
    await clearCache(cacheStore);
    return null;
  }

  return resultFromVerification(result, "cached", reason);
}

async function fallbackWithCache(options: RemoteRuleDeliveryOptions, reason: string): Promise<RemoteRuleLoadResult> {
  const cached = await loadCachedVerifiedRemoteRules(options, reason);
  if (cached) {
    return cached;
  }

  return {
    status: "fallback",
    rules: [],
    reason
  };
}

export async function loadVerifiedRemoteRules(options: RemoteRuleDeliveryOptions = {}): Promise<RemoteRuleLoadResult> {
  const endpoint = (options.endpoint ?? configuredEndpoint()).trim();
  if (endpoint.length === 0) {
    return {
      status: "disabled",
      rules: []
    };
  }

  const fetcher = options.fetcher ?? fetch;
  const cacheStore = options.cacheStore ?? createChromeRemoteRuleCacheStore();
  const now = options.now?.() ?? Date.now();
  const cacheTtlMs = options.cacheTtlMs ?? REMOTE_RULE_CACHE_TTL_MS;

  try {
    const response = await fetcher(endpoint, {
      method: "GET",
      headers: {
        accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return fallbackWithCache(
        { ...options, cacheStore, now: () => now },
        "ルール配信APIから取得できませんでした"
      );
    }

    const bundle = (await response.json()) as SignedRemoteRuleBundle;
    const result = await verifySignedRemoteRuleBundle(bundle, verificationKeyInput(options), verificationOptions(options, now));

    if (!result.ok) {
      await clearCache(cacheStore);
      return resultFromVerification(result, "verified");
    }

    await writeCache(cacheStore, createCacheEntry(bundle, result, now, cacheTtlMs));
    return resultFromVerification(result, "verified");
  } catch {
    return fallbackWithCache(
      { ...options, cacheStore, now: () => now },
      "ルール配信APIの取得または検証に失敗しました"
    );
  }
}
