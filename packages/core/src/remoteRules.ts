import {
  REMOTE_RULE_SIGNATURE_ALG,
  validateRemoteRuleBundlePayload,
  type RemoteDetectorRuleDefinition,
  type RemoteRuleBundlePayload,
  type SignedRemoteRuleBundle
} from "./remoteRuleSchema";
import type { DetectorRule, Finding } from "./types";

export {
  REMOTE_RULE_BUNDLE_SCHEMA_VERSION,
  REMOTE_RULE_SIGNATURE_ALG,
  validateRemoteRuleBundlePayload
} from "./remoteRuleSchema";
export type {
  RemoteDetectorRuleDefinition,
  RemoteRuleBundlePayload,
  SignedRemoteRuleBundle
} from "./remoteRuleSchema";

export type RemoteRuleVerificationResult =
  | {
      ok: true;
      payload: RemoteRuleBundlePayload;
      rules: DetectorRule[];
    }
  | {
      ok: false;
      reason: string;
    };

export interface RemoteRuleVerificationOptions {
  expectedKeyId?: string;
}

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue | undefined };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalize(value: JsonValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }

  return `{${Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key] as JsonValue)}`)
    .join(",")}}`;
}

function textBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function bytesToBase64Url(bytes: ArrayBuffer): string {
  const array = new Uint8Array(bytes);
  let binary = "";
  for (const byte of array) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function signingTarget(bundle: Pick<SignedRemoteRuleBundle, "alg" | "keyId" | "payload">): string {
  return canonicalize({
    alg: bundle.alg,
    keyId: bundle.keyId,
    payload: bundle.payload as unknown as JsonValue
  });
}

function subtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("Web Cryptoを利用できません");
  }

  return subtle;
}

function createRemoteFinding(input: string, rule: RemoteDetectorRuleDefinition, start: number, end: number): Finding {
  return {
    id: `remote:${rule.id}:${start}:${end}`,
    ruleId: `remote:${rule.id}`,
    source: "rule",
    label: rule.label,
    riskLevel: rule.riskLevel,
    ...(rule.category ? { category: rule.category } : {}),
    start,
    end,
    text: input.slice(start, end),
    placeholder: `[${rule.placeholderPrefix}_1]`,
    message: rule.message ?? "配信ルールで検出された注意情報です。",
    confidence: rule.confidence ?? 0.9
  };
}

function flagsWithGlobal(flags = ""): string {
  return Array.from(new Set(`${flags}g`.split(""))).join("");
}

function createRemoteRule(rule: RemoteDetectorRuleDefinition): DetectorRule | null {
  let pattern: RegExp;
  try {
    pattern = new RegExp(rule.pattern, flagsWithGlobal(rule.flags));
  } catch {
    return null;
  }

  return {
    id: `remote:${rule.id}`,
    label: rule.label,
    riskLevel: rule.riskLevel,
    enabled: rule.enabled !== false,
    createFindings(input: string): Finding[] {
      const findings: Finding[] = [];
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(input)) !== null) {
        if (match[0].length === 0) {
          pattern.lastIndex += 1;
          continue;
        }

        findings.push(createRemoteFinding(input, rule, match.index, match.index + match[0].length));
      }

      return findings;
    }
  };
}

export function createRemoteDetectorRules(payload: RemoteRuleBundlePayload): DetectorRule[] {
  return payload.rules.map(createRemoteRule).filter((rule): rule is DetectorRule => rule !== null);
}

export async function signRemoteRuleBundle(
  payload: RemoteRuleBundlePayload,
  privateJwk: JsonWebKey,
  keyId: string
): Promise<SignedRemoteRuleBundle> {
  const normalizedPayload = validateRemoteRuleBundlePayload(payload);
  if (!normalizedPayload) {
    throw new Error("ルールバンドルの形式が不正です");
  }

  const subtle = subtleCrypto();
  const privateKey = await subtle.importKey("jwk", privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const unsigned = {
    alg: REMOTE_RULE_SIGNATURE_ALG,
    keyId,
    payload: normalizedPayload
  } satisfies Pick<SignedRemoteRuleBundle, "alg" | "keyId" | "payload">;
  const signature = await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, toArrayBuffer(textBytes(signingTarget(unsigned))));

  return {
    ...unsigned,
    signature: bytesToBase64Url(signature)
  };
}

export async function verifySignedRemoteRuleBundle(
  bundle: unknown,
  publicJwk: JsonWebKey,
  options: RemoteRuleVerificationOptions = {}
): Promise<RemoteRuleVerificationResult> {
  if (!isRecord(bundle)) {
    return { ok: false, reason: "署名付きルールバンドルの形式が不正です" };
  }

  if (bundle.alg !== REMOTE_RULE_SIGNATURE_ALG) {
    return { ok: false, reason: "未対応の署名方式です" };
  }

  const keyId = typeof bundle.keyId === "string" ? bundle.keyId : "";
  if (keyId.length === 0 || (options.expectedKeyId && keyId !== options.expectedKeyId)) {
    return { ok: false, reason: "署名鍵IDが一致しません" };
  }

  const payload = validateRemoteRuleBundlePayload(bundle.payload);
  if (!payload) {
    return { ok: false, reason: "ルールバンドルの形式が不正です" };
  }

  const signature = typeof bundle.signature === "string" ? bundle.signature : "";
  if (signature.length === 0) {
    return { ok: false, reason: "署名がありません" };
  }

  try {
    const subtle = subtleCrypto();
    const publicKey = await subtle.importKey("jwk", publicJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const ok = await subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      toArrayBuffer(base64UrlToBytes(signature)),
      toArrayBuffer(textBytes(signingTarget({ alg: REMOTE_RULE_SIGNATURE_ALG, keyId, payload })))
    );

    if (!ok) {
      return { ok: false, reason: "ルールバンドルの署名を検証できません" };
    }

    return {
      ok: true,
      payload,
      rules: createRemoteDetectorRules(payload)
    };
  } catch {
    return { ok: false, reason: "ルールバンドルの署名検証に失敗しました" };
  }
}
