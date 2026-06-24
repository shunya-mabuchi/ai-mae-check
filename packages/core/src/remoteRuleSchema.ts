import type { DlpCategory, RiskLevel } from "./types";

export const REMOTE_RULE_BUNDLE_SCHEMA_VERSION = 1;
export const REMOTE_RULE_SIGNATURE_ALG = "ECDSA-P256-SHA256";
export type RemoteRuleDeliveryStatus = "active" | "paused";

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
  expiresAt?: string;
  deliveryStatus?: RemoteRuleDeliveryStatus;
  minExtensionVersion?: string;
  rules: RemoteDetectorRuleDefinition[];
}

export interface SignedRemoteRuleBundle {
  alg: typeof REMOTE_RULE_SIGNATURE_ALG;
  keyId: string;
  payload: RemoteRuleBundlePayload;
  signature: string;
}

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
  const expiresAt = typeof value.expiresAt === "string" ? value.expiresAt.trim() : undefined;
  const deliveryStatus =
    value.deliveryStatus === "active" || value.deliveryStatus === "paused"
      ? (value.deliveryStatus as RemoteRuleDeliveryStatus)
      : undefined;
  const minExtensionVersion =
    typeof value.minExtensionVersion === "string" ? value.minExtensionVersion.trim() : undefined;
  const rules = Array.isArray(value.rules)
    ? value.rules.map(validateRule).filter((rule): rule is RemoteDetectorRuleDefinition => rule !== null)
    : [];

  if (schemaVersion !== REMOTE_RULE_BUNDLE_SCHEMA_VERSION || version.length === 0 || Number.isNaN(Date.parse(generatedAt))) {
    return null;
  }

  if (typeof value.deliveryStatus !== "undefined" && !deliveryStatus) {
    return null;
  }

  if (expiresAt) {
    const expiresAtMs = Date.parse(expiresAt);
    if (Number.isNaN(expiresAtMs) || expiresAtMs <= Date.parse(generatedAt)) {
      return null;
    }
  }

  if (!Array.isArray(value.rules) || rules.length !== value.rules.length || rules.length > 100) {
    return null;
  }

  return {
    schemaVersion: REMOTE_RULE_BUNDLE_SCHEMA_VERSION,
    version,
    generatedAt,
    ...(expiresAt ? { expiresAt } : {}),
    ...(deliveryStatus ? { deliveryStatus } : {}),
    ...(minExtensionVersion ? { minExtensionVersion } : {}),
    rules
  };
}
