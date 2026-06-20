import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const releaseConfigPath = resolve("apps/extension/config/rule-delivery.release.json");

export function failReleaseConfig(message) {
  throw new Error(`rule delivery release config is invalid: ${message}`);
}

export function loadRuleDeliveryReleaseConfig() {
  if (!existsSync(releaseConfigPath)) {
    failReleaseConfig(`missing ${releaseConfigPath}`);
  }

  return JSON.parse(readFileSync(releaseConfigPath, "utf8"));
}

export function assertRuleDeliveryReleaseConfig(config) {
  if (typeof config?.endpoint !== "string" || config.endpoint.trim().length === 0) {
    failReleaseConfig("endpoint must be a non-empty string");
  }

  let endpointUrl;
  try {
    endpointUrl = new URL(config.endpoint);
  } catch {
    failReleaseConfig("endpoint must be a valid URL");
  }

  if (endpointUrl.protocol !== "https:") {
    failReleaseConfig("endpoint must use https");
  }

  if (endpointUrl.pathname !== "/api/rules/latest") {
    failReleaseConfig("endpoint pathname must be /api/rules/latest");
  }

  if (/(example\.(com|org|net|test)|replace_|changeme)/i.test(config.endpoint)) {
    failReleaseConfig("endpoint must be a production release URL, not a placeholder");
  }

  if (typeof config?.keyId !== "string" || config.keyId.trim().length === 0) {
    failReleaseConfig("keyId must be a non-empty string");
  }

  const publicJwk = config?.publicJwk;
  if (typeof publicJwk !== "object" || publicJwk === null) {
    failReleaseConfig("publicJwk must be an object");
  }

  for (const field of ["kty", "crv", "x", "y"]) {
    if (typeof publicJwk[field] !== "string" || publicJwk[field].trim().length === 0) {
      failReleaseConfig(`publicJwk.${field} must be a non-empty string`);
    }
  }

  if ("d" in publicJwk) {
    failReleaseConfig("publicJwk must not contain a private 'd' field");
  }

  return {
    endpoint: config.endpoint.trim(),
    keyId: config.keyId.trim(),
    publicJwk
  };
}
