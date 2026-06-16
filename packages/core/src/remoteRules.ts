import type { DetectorRule, DlpCategory, Finding, RiskLevel } from "./types";

export const REMOTE_RULE_BUNDLE_SCHEMA_VERSION = 1;
export const REMOTE_RULE_SIGNATURE_ALG = "ECDSA-P256-SHA256";

export interface RemoteDetectorRuleDefinition {
  id: string;
  label: string;
  riskLevel: RiskLevel;
  category?: DlpCategory;
  placeholderPrefix: string;
  pattern: string;
  flags?: string;
  message?: string;
  confidence?: number;
  enabled?: boolean;
}

export interface RemoteRuleBundlePayload {
  schemaVersion: typeof REMOTE_RULE_BUNDLE_SCHEMA_VERSION;
  version: string;
  generatedAt: string;
  minExtensionVersion?: string;
  rules: RemoteDetectorRuleDefinition[];
}

export interface SignedRemoteRuleBundle {
  alg: typeof REMOTE_RULE_SIGNATURE_ALG;
  keyId: string;
  payload: RemoteRuleBundlePayload;
  signature: string;
}

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

const riskLevels: RiskLevel[] = ["critical", "high", "medium", "low"];
const categories: DlpCategory[] = [
  "person",
  "organization",
  "address",
  "email",
  "phone",
  "id",
  "secret",
  "financial",
  "medical",
  "legal",
  "date",
  "url",
  "file",
  "other"
];

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

function validateRule(rule: unknown): RemoteDetectorRuleDefinition | null {
  if (!isRecord(rule)) {
    return null;
  }

  const id = typeof rule.id === "string" ? rule.id.trim() : "";
  const label = typeof rule.label === "string" ? rule.label.trim() : "";
  const riskLevel = riskLevels.includes(rule.riskLevel as RiskLevel) ? (rule.riskLevel as RiskLevel) : null;
  const category = categories.includes(rule.category as DlpCategory) ? (rule.category as DlpCategory) : undefined;
  const placeholderPrefix = typeof rule.placeholderPrefix === "string" ? rule.placeholderPrefix.trim() : "";
  const pattern = typeof rule.pattern === "string" ? rule.pattern : "";
  const flags = typeof rule.flags === "string" ? rule.flags : "";
  const message = typeof rule.message === "string" ? rule.message.trim() : undefined;
  const confidence = typeof rule.confidence === "number" ? Math.min(1, Math.max(0, rule.confidence)) : undefined;
  const enabled = typeof rule.enabled === "boolean" ? rule.enabled : undefined;

  if (!/^[a-z0-9][a-z0-9_-]{1,62}$/u.test(id) || label.length === 0 || !riskLevel) {
    return null;
  }

  if (!/^[A-Z0-9_]{2,40}$/u.test(placeholderPrefix) || pattern.length === 0 || pattern.length > 500) {
    return null;
  }

  if (!/^[dgimsuvy]*$/u.test(flags)) {
    return null;
  }

  return {
    id,
    label,
    riskLevel,
    ...(category ? { category } : {}),
    placeholderPrefix,
    pattern,
    flags,
    ...(message ? { message } : {}),
    ...(typeof confidence === "number" ? { confidence } : {}),
    ...(typeof enabled === "boolean" ? { enabled } : {})
  };
}

export function validateRemoteRuleBundlePayload(value: unknown): RemoteRuleBundlePayload | null {
  if (!isRecord(value)) {
    return null;
  }

  const schemaVersion = value.schemaVersion;
  const version = typeof value.version === "string" ? value.version.trim() : "";
  const generatedAt = typeof value.generatedAt === "string" ? value.generatedAt.trim() : "";
  const minExtensionVersion = typeof value.minExtensionVersion === "string" ? value.minExtensionVersion.trim() : undefined;
  const rules = Array.isArray(value.rules) ? value.rules.map(validateRule).filter((rule): rule is RemoteDetectorRuleDefinition => rule !== null) : [];

  if (schemaVersion !== REMOTE_RULE_BUNDLE_SCHEMA_VERSION || version.length === 0 || Number.isNaN(Date.parse(generatedAt))) {
    return null;
  }

  if (!Array.isArray(value.rules) || rules.length !== value.rules.length || rules.length > 100) {
    return null;
  }

  return {
    schemaVersion: REMOTE_RULE_BUNDLE_SCHEMA_VERSION,
    version,
    generatedAt,
    ...(minExtensionVersion ? { minExtensionVersion } : {}),
    rules
  };
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
