import type { SignedRemoteRuleBundle } from "@ai-mae-check/core";

export const REMOTE_RULE_CACHE_KEY = "ai-mae-check.remoteRules.v1";

export interface VerifiedRemoteRuleCacheEntry {
  bundle: SignedRemoteRuleBundle;
  keyId: string;
  version: string;
  generatedAt: string;
  cachedAt: number;
  expiresAt: number;
}

export interface RemoteRuleCacheStore {
  read(): Promise<VerifiedRemoteRuleCacheEntry | null>;
  write(entry: VerifiedRemoteRuleCacheEntry): Promise<void>;
  clear(): Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSignedBundle(value: unknown): value is SignedRemoteRuleBundle {
  return (
    isRecord(value) &&
    typeof value.alg === "string" &&
    typeof value.keyId === "string" &&
    typeof value.signature === "string" &&
    isRecord(value.payload)
  );
}

export function normalizeRemoteRuleCacheEntry(value: unknown): VerifiedRemoteRuleCacheEntry | null {
  if (!isRecord(value) || !isSignedBundle(value.bundle)) {
    return null;
  }

  const keyId = typeof value.keyId === "string" ? value.keyId : "";
  const version = typeof value.version === "string" ? value.version : "";
  const generatedAt = typeof value.generatedAt === "string" ? value.generatedAt : "";
  const cachedAt = typeof value.cachedAt === "number" ? value.cachedAt : Number.NaN;
  const expiresAt = typeof value.expiresAt === "number" ? value.expiresAt : Number.NaN;

  if (
    keyId.length === 0 ||
    version.length === 0 ||
    generatedAt.length === 0 ||
    !Number.isFinite(cachedAt) ||
    !Number.isFinite(expiresAt)
  ) {
    return null;
  }

  return {
    bundle: value.bundle,
    keyId,
    version,
    generatedAt,
    cachedAt,
    expiresAt
  };
}

function chromeStorageError(): Error | null {
  const message = chrome.runtime?.lastError?.message;
  return message ? new Error(`リモートルールキャッシュの操作に失敗しました。詳細: ${message}`) : null;
}

export function createChromeRemoteRuleCacheStore(): RemoteRuleCacheStore | null {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return null;
  }

  return {
    read() {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get(REMOTE_RULE_CACHE_KEY, (items) => {
          const error = chromeStorageError();
          if (error) {
            reject(error);
            return;
          }

          resolve(normalizeRemoteRuleCacheEntry(items[REMOTE_RULE_CACHE_KEY]));
        });
      });
    },
    write(entry) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [REMOTE_RULE_CACHE_KEY]: entry }, () => {
          const error = chromeStorageError();
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
    clear() {
      return new Promise((resolve, reject) => {
        chrome.storage.local.remove(REMOTE_RULE_CACHE_KEY, () => {
          const error = chromeStorageError();
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  };
}
