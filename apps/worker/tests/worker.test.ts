import { describe, expect, it } from "vitest";
import { verifySignedRemoteRuleBundle } from "@ai-mae-check/core";
import { handleRequest } from "../src/index";

const keyId = "worker-test-key";

async function createEnv() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);

  return {
    env: {
      RULE_KEY_ID: keyId,
      RULE_SIGNING_PRIVATE_JWK: JSON.stringify(privateJwk)
    },
    publicJwk
  };
}

describe("rules worker", () => {
  it("GET /api/rules/latest は署名検証できるルールバンドルを返す", async () => {
    const { env, publicJwk } = await createEnv();
    const response = await handleRequest(new Request("https://rules.example.test/api/rules/latest"), env);
    const body: unknown = await response.json();
    const verification = await verifySignedRemoteRuleBundle(body, publicJwk, { expectedKeyId: keyId });

    expect(response.status).toBe(200);
    expect(verification.ok).toBe(true);
  });

  it("GET以外のメソッドは受け付けない", async () => {
    const { env } = await createEnv();
    const response = await handleRequest(new Request("https://rules.example.test/api/rules/latest", { method: "POST" }), env);

    expect(response.status).toBe(405);
  });

  it("CORS preflightに応答する", async () => {
    const { env } = await createEnv();
    const response = await handleRequest(new Request("https://rules.example.test/api/rules/latest", { method: "OPTIONS" }), env);

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("署名秘密鍵が未設定なら配信しない", async () => {
    const response = await handleRequest(new Request("https://rules.example.test/api/rules/latest"), {});

    expect(response.status).toBe(503);
  });
});
