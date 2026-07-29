export const REMOTE_RULE_FETCH_MESSAGE = "ai-mae-check:fetch-remote-rules";

export interface RemoteRuleFetchRequest {
  type: typeof REMOTE_RULE_FETCH_MESSAGE;
  endpoint: string;
}

export interface RemoteRuleFetchResponse {
  ok: boolean;
  status: number;
  body: string;
  contentType: string;
}

export type RuntimeMessageSender = (message: RemoteRuleFetchRequest) => Promise<unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isRemoteRuleFetchRequest(value: unknown): value is RemoteRuleFetchRequest {
  return isRecord(value)
    && value.type === REMOTE_RULE_FETCH_MESSAGE
    && typeof value.endpoint === "string";
}

export function isRemoteRuleFetchResponse(value: unknown): value is RemoteRuleFetchResponse {
  return isRecord(value)
    && typeof value.ok === "boolean"
    && typeof value.status === "number"
    && typeof value.body === "string"
    && typeof value.contentType === "string";
}

export function createRemoteRuleFetchProxy(
  sendMessage: RuntimeMessageSender = (message) => chrome.runtime.sendMessage(message)
): typeof fetch {
  return async (input, init) => {
    const endpoint = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();

    if (method !== "GET" || init?.body) {
      return new Response(null, { status: 405, statusText: "Method Not Allowed" });
    }

    const message: RemoteRuleFetchRequest = {
      type: REMOTE_RULE_FETCH_MESSAGE,
      endpoint
    };
    const result = await sendMessage(message);
    if (!isRemoteRuleFetchResponse(result)) {
      return new Response(null, { status: 502, statusText: "Invalid Extension Response" });
    }

    return new Response(result.body, {
      status: result.status,
      headers: {
        "content-type": result.contentType
      }
    });
  };
}
