import { afterEach, describe, expect, it, vi } from "vitest";
import { LLM_BRIDGE_CONNECT, LLM_BRIDGE_READY } from "../src/lib/llmBridgeMessages";

const analyzeMock = vi.fn();
const disposeMock = vi.fn();

vi.mock("../src/lib/wasmContextWorkerClient", () => ({
  analyzeContextWithWasmWorker: analyzeMock,
  disposeWasmContextWorker: disposeMock
}));

class FakeMessagePort {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  readonly postedMessages: unknown[] = [];
  started = false;

  postMessage(message: unknown): void {
    this.postedMessages.push(message);
  }

  start(): void {
    this.started = true;
  }

  dispatch(message: unknown): void {
    this.onmessage?.({ data: message } as MessageEvent<unknown>);
  }
}

async function loadBridgePage() {
  vi.resetModules();
  let messageHandler: ((event: MessageEvent<unknown>) => void) | null = null;
  let pagehideHandler: (() => void) | null = null;
  vi.stubGlobal("window", {
    location: { href: "chrome-extension://test/llm-bridge.html?nonce=expected-nonce" },
    addEventListener: vi.fn((type: string, listener: (event: MessageEvent<unknown>) => void) => {
      if (type === "message") messageHandler = listener;
      if (type === "pagehide") pagehideHandler = listener as () => void;
    })
  });
  await import("../src/llmBridgePage");
  if (!messageHandler) throw new Error("message handler was not registered");
  return { messageHandler, pagehideHandler };
}

function connect(messageHandler: (event: MessageEvent<unknown>) => void): FakeMessagePort {
  const port = new FakeMessagePort();
  messageHandler({
    data: { type: LLM_BRIDGE_CONNECT, nonce: "expected-nonce" },
    ports: [port]
  } as MessageEvent<unknown>);
  return port;
}

describe("llmBridgePage", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    analyzeMock.mockReset();
    disposeMock.mockReset();
  });

  it("nonceが一致した接続だけをreadyにする", async () => {
    const { messageHandler } = await loadBridgePage();
    const port = connect(messageHandler);

    expect(port.started).toBe(true);
    expect(port.postedMessages).toEqual([{ type: LLM_BRIDGE_READY }]);
  });

  it("解析要求をCPU / WASM Workerへ渡す", async () => {
    analyzeMock.mockResolvedValue({
      candidates: [],
      summary: "完了",
      rawText: "",
      modelId: "test-model",
      elapsedMs: 5
    });
    const { messageHandler } = await loadBridgePage();
    const port = connect(messageHandler);
    port.dispatch({
      type: "analyze-context",
      requestId: "request-1",
      inputText: "候補者の評価を確認します。",
      options: { maxCandidates: 4 }
    });

    await vi.waitFor(() => {
      expect(analyzeMock).toHaveBeenCalledWith(
        "候補者の評価を確認します。",
        expect.objectContaining({ maxCandidates: 4, onProgress: expect.any(Function) })
      );
    });
    expect(port.postedMessages).toContainEqual(
      expect.objectContaining({ type: "analyze-result", requestId: "request-1" })
    );
  });

  it("不正な要求へ本文を含まないエラーを返す", async () => {
    const { messageHandler } = await loadBridgePage();
    const port = connect(messageHandler);
    port.dispatch({ type: "unknown", requestId: "bad-1", inputText: "秘密本文" });

    await vi.waitFor(() => {
      expect(port.postedMessages).toContainEqual(
        expect.objectContaining({ type: "error", requestId: "bad-1" })
      );
    });
    expect(JSON.stringify(port.postedMessages)).not.toContain("秘密本文");
  });

  it("ページ破棄時にWorkerを破棄する", async () => {
    const { pagehideHandler } = await loadBridgePage();
    pagehideHandler?.();
    expect(disposeMock).toHaveBeenCalledTimes(1);
  });
});
