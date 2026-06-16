import {
  verifySignedRemoteRuleBundle,
  type DetectorRule,
  type RemoteRuleVerificationResult
} from "@ai-mae-check/core";

export const RULE_DELIVERY_KEY_ID = "ai-mae-check-demo-rules-2026-06";

export const RULE_DELIVERY_PUBLIC_JWK: JsonWebKey = {
  key_ops: ["verify"],
  ext: true,
  kty: "EC",
  x: "2rm7jWFWA7lWaLKf3hgpouksKaAsDUdkvvWwmyttBjc",
  y: "LPHSECPxHyFozs_gDoK-8Mi77lumT3zQBnHWqY3A6tI",
  crv: "P-256"
};

export type RemoteRuleLoadStatus = "disabled" | "verified" | "fallback";

export interface RemoteRuleLoadResult {
  status: RemoteRuleLoadStatus;
  rules: DetectorRule[];
  version?: string;
  reason?: string;
}

export interface RemoteRuleDeliveryOptions {
  endpoint?: string;
  publicJwk?: JsonWebKey;
  expectedKeyId?: string;
  fetcher?: typeof fetch;
}

type ImportMetaWithEnv = ImportMeta & {
  env?: {
    VITE_RULE_DELIVERY_URL?: string;
  };
};

function configuredEndpoint(): string {
  return ((import.meta as ImportMetaWithEnv).env?.VITE_RULE_DELIVERY_URL ?? "").trim();
}

function resultFromVerification(result: RemoteRuleVerificationResult): RemoteRuleLoadResult {
  if (!result.ok) {
    return {
      status: "fallback",
      rules: [],
      reason: result.reason
    };
  }

  return {
    status: "verified",
    rules: result.rules,
    version: result.payload.version
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

  try {
    const response = await fetcher(endpoint, {
      method: "GET",
      headers: {
        accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return {
        status: "fallback",
        rules: [],
        reason: "ルール配信APIから取得できませんでした"
      };
    }

    const bundle: unknown = await response.json();
    const result = await verifySignedRemoteRuleBundle(bundle, options.publicJwk ?? RULE_DELIVERY_PUBLIC_JWK, {
      expectedKeyId: options.expectedKeyId ?? RULE_DELIVERY_KEY_ID
    });

    return resultFromVerification(result);
  } catch {
    return {
      status: "fallback",
      rules: [],
      reason: "ルール配信APIの取得または検証に失敗しました"
    };
  }
}
