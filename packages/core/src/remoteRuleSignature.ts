import type { RemoteDetectorRuleDefinition, RemoteRuleBundlePayload, SignedRemoteRuleBundle } from "./remoteRuleSchema";

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue | undefined };

export function canonicalizeJson(value: JsonValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeJson(item)).join(",")}]`;
  }

  return `{${Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort()
    .map((key) => {
      const item = value[key];
      return item === undefined ? "" : `${JSON.stringify(key)}:${canonicalizeJson(item)}`;
    })
    .filter((item) => item.length > 0)
    .join(",")}}`;
}

export function textBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function bytesToBase64Url(bytes: ArrayBuffer): string {
  const array = new Uint8Array(bytes);
  let binary = "";
  for (const byte of array) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

export function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function remoteRuleDefinitionToJsonValue(rule: RemoteDetectorRuleDefinition): JsonValue {
  return {
    id: rule.id,
    label: rule.label,
    riskLevel: rule.riskLevel,
    ...(rule.category ? { category: rule.category } : {}),
    placeholderPrefix: rule.placeholderPrefix,
    pattern: rule.pattern,
    ...(rule.flags ? { flags: rule.flags } : {}),
    ...(rule.message ? { message: rule.message } : {}),
    ...(typeof rule.confidence === "number" ? { confidence: rule.confidence } : {}),
    ...(typeof rule.enabled === "boolean" ? { enabled: rule.enabled } : {})
  };
}

export function remoteRulePayloadToJsonValue(payload: RemoteRuleBundlePayload): JsonValue {
  return {
    schemaVersion: payload.schemaVersion,
    version: payload.version,
    generatedAt: payload.generatedAt,
    ...(payload.expiresAt ? { expiresAt: payload.expiresAt } : {}),
    ...(payload.deliveryStatus ? { deliveryStatus: payload.deliveryStatus } : {}),
    ...(payload.minExtensionVersion ? { minExtensionVersion: payload.minExtensionVersion } : {}),
    rules: payload.rules.map(remoteRuleDefinitionToJsonValue)
  };
}

export function createRemoteRuleSigningTarget(bundle: Pick<SignedRemoteRuleBundle, "alg" | "keyId" | "payload">): string {
  return canonicalizeJson({
    alg: bundle.alg,
    keyId: bundle.keyId,
    payload: remoteRulePayloadToJsonValue(bundle.payload)
  });
}
