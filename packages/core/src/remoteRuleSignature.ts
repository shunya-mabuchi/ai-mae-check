import type { SignedRemoteRuleBundle } from "./remoteRuleSchema";

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
    .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(value[key] as JsonValue)}`)
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

export function createRemoteRuleSigningTarget(bundle: Pick<SignedRemoteRuleBundle, "alg" | "keyId" | "payload">): string {
  return canonicalizeJson({
    alg: bundle.alg,
    keyId: bundle.keyId,
    payload: bundle.payload as unknown as JsonValue
  });
}
