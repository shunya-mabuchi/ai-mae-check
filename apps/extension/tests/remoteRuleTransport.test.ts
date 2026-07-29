import { describe, expect, it, vi } from "vitest";
import {
  createRemoteRuleFetchProxy,
  REMOTE_RULE_FETCH_MESSAGE,
  type RuntimeMessageSender
} from "../src/lib/remoteRuleTransport";

describe("追加ルール取得プロキシ", () => {
  it("backgroundへGET取得だけを依頼する", async () => {
    const sendMessage: RuntimeMessageSender = vi.fn(async () => ({
      ok: true,
      status: 200,
      body: '{"schema":1}',
      contentType: "application/json"
    }));
    const fetcher = createRemoteRuleFetchProxy(sendMessage);

    const response = await fetcher("https://shunya-mabuchi.github.io/ai-mae-check/api/rules/latest.json", {
      method: "GET"
    });

    expect(response.ok).toBe(true);
    expect(await response.json()).toEqual({ schema: 1 });
    expect(sendMessage).toHaveBeenCalledWith({
      type: REMOTE_RULE_FETCH_MESSAGE,
      endpoint: "https://shunya-mabuchi.github.io/ai-mae-check/api/rules/latest.json"
    });
  });

  it("GET以外やリクエスト本文を許可しない", async () => {
    const sendMessage: RuntimeMessageSender = vi.fn();
    const fetcher = createRemoteRuleFetchProxy(sendMessage);

    const response = await fetcher("https://example.test/rules.json", {
      method: "POST",
      body: "本文は送信しない"
    });

    expect(response.status).toBe(405);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("不正なbackground応答を取得失敗として扱う", async () => {
    const fetcher = createRemoteRuleFetchProxy(async () => ({ unexpected: true }));

    const response = await fetcher("https://example.test/rules.json");

    expect(response.status).toBe(502);
  });
});
