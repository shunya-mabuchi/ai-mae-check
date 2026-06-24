import {
  REMOTE_RULE_BUNDLE_SCHEMA_VERSION,
  signRemoteRuleBundle,
  type RemoteRuleBundlePayload
} from "@ai-mae-check/core";

interface Env {
  RULE_SIGNING_PRIVATE_JWK?: string;
  RULE_KEY_ID?: string;
}

const HEALTH_PATH = "/health";
const LATEST_RULES_PATH = "/api/rules/latest";
const DEFAULT_RULE_KEY_ID = "ai-mae-check-rules-2026-06-v2";

const publicJsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=300",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "accept"
};

const latestRules: RemoteRuleBundlePayload = {
  schemaVersion: REMOTE_RULE_BUNDLE_SCHEMA_VERSION,
  version: "2026.06.23.1",
  generatedAt: "2026-06-23T00:00:00.000Z",
  expiresAt: "2099-12-31T00:00:00.000Z",
  deliveryStatus: "active",
  minExtensionVersion: "0.1.0",
  rules: [
    {
      id: "slack_webhook_url",
      label: "Slack webhook URL",
      riskLevel: "high",
      category: "secret",
      placeholderPrefix: "WEBHOOK_URL",
      pattern: "https://hooks\\.slack\\.com/services/[A-Za-z0-9/_-]+",
      flags: "g",
      message: "Slack webhook URLs should be masked before sharing.",
      confidence: 0.96
    }
  ]
};

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...publicJsonHeaders,
      ...init.headers
    }
  });
}

function noStoreJsonResponse(body: unknown, status: number): Response {
  return jsonResponse(body, {
    status,
    headers: { "cache-control": "no-store" }
  });
}

function readPrivateJwk(env: Env): JsonWebKey | null {
  if (!env.RULE_SIGNING_PRIVATE_JWK) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(env.RULE_SIGNING_PRIVATE_JWK);
    return typeof parsed === "object" && parsed !== null ? (parsed as JsonWebKey) : null;
  } catch {
    return null;
  }
}

function routeFor(url: URL): "health" | "latest" | "not-found" {
  if (url.pathname === HEALTH_PATH) {
    return "health";
  }

  if (url.pathname === LATEST_RULES_PATH) {
    return "latest";
  }

  return "not-found";
}

async function createSignedLatestRuleBundle(env: Env) {
  const privateJwk = readPrivateJwk(env);
  if (!privateJwk) {
    return null;
  }

  return signRemoteRuleBundle(latestRules, privateJwk, env.RULE_KEY_ID ?? DEFAULT_RULE_KEY_ID);
}

async function latestRuleResponse(env: Env): Promise<Response> {
  try {
    const signedBundle = await createSignedLatestRuleBundle(env);
    if (!signedBundle) {
      return noStoreJsonResponse({ error: "rule signing is not configured" }, 503);
    }

    return jsonResponse(signedBundle);
  } catch {
    return noStoreJsonResponse({ error: "rule signing is unavailable" }, 500);
  }
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const route = routeFor(new URL(request.url));

  if (route === "health") {
    return jsonResponse({ ok: true });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: publicJsonHeaders });
  }

  if (route === "not-found") {
    return noStoreJsonResponse({ error: "not found" }, 404);
  }

  if (request.method !== "GET") {
    return noStoreJsonResponse({ error: "method not allowed" }, 405);
  }

  return latestRuleResponse(env);
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  }
};
