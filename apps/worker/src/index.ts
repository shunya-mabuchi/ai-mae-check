import {
  REMOTE_RULE_BUNDLE_SCHEMA_VERSION,
  signRemoteRuleBundle,
  type RemoteRuleBundlePayload
} from "@ai-mae-check/core";

interface Env {
  RULE_SIGNING_PRIVATE_JWK?: string;
  RULE_KEY_ID?: string;
}

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=300",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "accept"
};

const latestRules: RemoteRuleBundlePayload = {
  schemaVersion: REMOTE_RULE_BUNDLE_SCHEMA_VERSION,
  version: "2026.06.16.1",
  generatedAt: "2026-06-16T00:00:00.000Z",
  minExtensionVersion: "0.1.0",
  rules: [
    {
      id: "slack_webhook_url",
      label: "Slack webhook URL風文字列",
      riskLevel: "high",
      category: "secret",
      placeholderPrefix: "WEBHOOK_URL",
      pattern: "https://hooks\\.slack\\.com/services/[A-Za-z0-9/_-]+",
      flags: "g",
      message: "Webhook URLは外部へ送る前に確認したい秘密情報です。",
      confidence: 0.96
    }
  ]
};

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...init.headers
    }
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

async function latestRuleResponse(env: Env): Promise<Response> {
  const privateJwk = readPrivateJwk(env);
  const keyId = env.RULE_KEY_ID ?? "ai-mae-check-demo-rules-2026-06";

  if (!privateJwk) {
    return jsonResponse(
      {
        error: "RULE_SIGNING_PRIVATE_JWK is not configured"
      },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  const signed = await signRemoteRuleBundle(latestRules, privateJwk, keyId);
  return jsonResponse(signed);
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/health") {
    return jsonResponse({ ok: true });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: jsonHeaders });
  }

  if (url.pathname !== "/api/rules/latest") {
    return jsonResponse({ error: "not found" }, { status: 404, headers: { "cache-control": "no-store" } });
  }

  if (request.method !== "GET") {
    return jsonResponse({ error: "method not allowed" }, { status: 405, headers: { "cache-control": "no-store" } });
  }

  return latestRuleResponse(env);
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  }
};
