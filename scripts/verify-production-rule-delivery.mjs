import {
  assertRuleDeliveryReleaseConfig,
  loadRuleDeliveryReleaseConfig
} from "./lib/rule-delivery-release-config.mjs";

function fail(message) {
  throw new Error(`production rule delivery verification failed: ${message}`);
}

function canonicalizeJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeJson(item)).join(",")}]`;
  }

  return `{${Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(value[key])}`)
    .join(",")}}`;
}

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return new Uint8Array(Buffer.from(padded, "base64"));
}

async function verifyBundle(bundle, config) {
  if (bundle?.alg !== "ECDSA-P256-SHA256") {
    fail("unexpected signature algorithm");
  }

  const publicKeyEntry = config.publicKeys.find((entry) => entry.keyId === bundle.keyId);
  if (!publicKeyEntry) {
    fail(`keyId mismatch: expected one of ${config.publicKeys.map((entry) => entry.keyId).join(", ")}, got ${String(bundle.keyId)}`);
  }

  if (typeof bundle.signature !== "string" || bundle.signature.length === 0) {
    fail("signature is missing");
  }

  if (typeof bundle.payload?.version !== "string" || !Array.isArray(bundle.payload?.rules)) {
    fail("payload shape is invalid");
  }

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    publicKeyEntry.publicJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );
  const signingTarget = canonicalizeJson({
    alg: bundle.alg,
    keyId: bundle.keyId,
    payload: bundle.payload
  });
  const ok = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    base64UrlToBytes(bundle.signature),
    new TextEncoder().encode(signingTarget)
  );

  if (!ok) {
    fail("signature verification failed");
  }
}

const config = assertRuleDeliveryReleaseConfig(loadRuleDeliveryReleaseConfig());
const response = await fetch(config.endpoint, {
  method: "GET",
  headers: {
    accept: "application/json"
  }
});

if (!response.ok) {
  fail(`endpoint returned HTTP ${response.status}`);
}

const bundle = await response.json();
await verifyBundle(bundle, config);

console.log(
  JSON.stringify({
    ok: true,
    endpoint: config.endpoint,
    keyId: bundle.keyId,
    version: bundle.payload.version,
    ruleCount: bundle.payload.rules.length
  })
);
