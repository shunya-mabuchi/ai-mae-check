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
  it("GET /api/rules/latest returns a verifiable signed bundle", async () => {
    const { env, publicJwk } = await createEnv();
    const response = await handleRequest(new Request("https://rules.example.test/api/rules/latest"), env);
    const body: unknown = await response.json();
    const verification = await verifySignedRemoteRuleBundle(body, publicJwk, { expectedKeyId: keyId });

    expect(response.status).toBe(200);
    expect(verification.ok).toBe(true);
  });

  it("GET /health keeps the existing behavior", async () => {
    const response = await handleRequest(new Request("https://rules.example.test/health"), {});

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("rejects non-GET methods on /api/rules/latest", async () => {
    const { env } = await createEnv();
    const response = await handleRequest(new Request("https://rules.example.test/api/rules/latest", { method: "POST" }), env);

    expect(response.status).toBe(405);
  });

  it("handles CORS preflight", async () => {
    const { env } = await createEnv();
    const response = await handleRequest(new Request("https://rules.example.test/api/rules/latest", { method: "OPTIONS" }), env);

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("does not leak env names when signing is not configured", async () => {
    const response = await handleRequest(new Request("https://rules.example.test/api/rules/latest"), {});
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(body).not.toContain("RULE_SIGNING_PRIVATE_JWK");
  });

  it("does not leak signing material when signing fails", async () => {
    const invalidPrivateJwk = JSON.stringify({
      kty: "EC",
      crv: "P-256",
      x: "public-x",
      y: "public-y",
      ext: true,
      key_ops: ["verify"]
    });
    const response = await handleRequest(new Request("https://rules.example.test/api/rules/latest"), {
      RULE_KEY_ID: keyId,
      RULE_SIGNING_PRIVATE_JWK: invalidPrivateJwk
    });
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(body).not.toContain(invalidPrivateJwk);
    expect(body).not.toContain("\"d\"");
  });
});
