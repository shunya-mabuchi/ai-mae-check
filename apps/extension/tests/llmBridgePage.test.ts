import { afterEach, describe, expect, it, vi } from "vitest";
import { LLM_BRIDGE_CONNECT, LLM_BRIDGE_READY } from "../src/lib/llmBridgeMessages";

const analyzeMock = vi.fn();
const statusMock = vi.fn(() => ({
  phase: "idle",
  ready: false,
  modelId: "test-model",
  message: "AI文脈チェックは未準備です。"
}));
const disposeMock = vi.fn();
const runtimeServiceFactoryMock = vi.fn(() => ({
  analyze: analyzeMock,
  status: statusMock,
  prepare: vi.fn(),
  dispose: disposeMock
}));
const createLocalLlmRuntimeServiceMock = vi.fn((...args: unknown[]) => runtimeServiceFactoryMock(...args));

vi.mock("@ai-mae-check/llm", () => ({
  createLocalLlmRuntimeService: createLocalLlmRuntimeServiceMock
}));

vi.mock("../src/lib/extensionRuntime", () => ({
  getExtensionResourceUrl: vi.fn((path: string) => `chrome-extension://test/${path}`)
}));

vi.mock("../src/lib/llmBridgeFallback", () => ({
  createJsonParseBridgeFallbackResult: vi.fn(() => null)
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

async function loadBridgePage(options?: { expectedNonce?: string | null }) {
  vi.resetModules();

  let messageHandler: ((event: MessageEvent<unknown>) => void) | null = null;
  const href =
    options?.expectedNonce === null
      ? "chrome-extension://test/llm-bridge.html"
      : `chrome-extension://test/llm-bridge.html?nonce=${options?.expectedNonce ?? "expected-nonce"}`;

  vi.stubGlobal("window", {
    location: { href },
    addEventListener: vi.fn((type: string, listener: (event: MessageEvent<unknown>) => void) => {
      if (type === "message") {
        messageHandler = listener;
      }
    })
  });

  await import("../src/llmBridgePage");

  if (!messageHandler) {
    throw new Error("message handler was not registered");
  }

  return { messageHandler };
}

describe("llmBridgePage", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    analyzeMock.mockReset();
    statusMock.mockReset();
    statusMock.mockReturnValue({
      phase: "idle",
      ready: false,
      modelId: "test-model",
      message: "AI文脈チェックは未準備です。"
    });
    disposeMock.mockReset();
    runtimeServiceFactoryMock.mockReset();
    runtimeServiceFactoryMock.mockImplementation(() => ({
      analyze: analyzeMock,
      status: statusMock,
      prepare: vi.fn(),
      dispose: disposeMock
    }));
    createLocalLlmRuntimeServiceMock.mockClear();
  });

  it("nonceが一致した接続だけreadyにして既存のanalyzeフローを維持する", async () => {
    analyzeMock.mockResolvedValue({
      candidates: [],
      summary: "ok",
      rawText: "",
      modelId: "test-model",
      elapsedMs: 5
    });

    const { messageHandler } = await loadBridgePage();
    const port = new FakeMessagePort();

    messageHandler({
      data: { type: LLM_BRIDGE_CONNECT, nonce: "expected-nonce" },
      ports: [port]
    } as MessageEvent<unknown>);

    expect(port.started).toBe(true);
    expect(port.postedMessages).toEqual([{ type: LLM_BRIDGE_READY }]);

    port.dispatch({
      type: "analyze",
      requestId: "request-1",
      inputText: "本文です",
      modelId: "test-model",
      options: {}
    });

    await vi.waitFor(() => {
      expect(analyzeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          input: "本文です",
          onProgress: expect.any(Function)
        })
      );
    });
    expect(port.postedMessages).toContainEqual(
      expect.objectContaining({
        type: "analyze-result",
        requestId: "request-1"
      })
    );
    expect(disposeMock).not.toHaveBeenCalled();
  });

  it("モデル準備状態を返す", async () => {
    analyzeMock.mockResolvedValue({
      candidates: [],
      summary: "ok",
      rawText: "",
      modelId: "test-model",
      elapsedMs: 5
    });
    const { messageHandler } = await loadBridgePage();
    const port = new FakeMessagePort();

    messageHandler({
      data: { type: LLM_BRIDGE_CONNECT, nonce: "expected-nonce" },
      ports: [port]
    } as MessageEvent<unknown>);

    port.dispatch({
      type: "model-state",
      requestId: "state-1",
      modelId: "test-model",
      options: {}
    });

    await vi.waitFor(() => {
      expect(port.postedMessages).toContainEqual({
        type: "model-state-result",
        requestId: "state-1",
        ready: false
      });
    });

    port.dispatch({
      type: "analyze",
      requestId: "request-1",
      inputText: "本文です",
      modelId: "test-model",
      options: {}
    });

    await vi.waitFor(() => {
      expect(analyzeMock).toHaveBeenCalled();
    });
    statusMock.mockReturnValue({
      phase: "ready",
      ready: true,
      modelId: "test-model",
      message: "AI文脈チェックを実行できます。"
    });

    port.dispatch({
      type: "model-state",
      requestId: "state-2",
      modelId: "test-model",
      options: {}
    });

    await vi.waitFor(() => {
      expect(port.postedMessages).toContainEqual({
        type: "model-state-result",
        requestId: "state-2",
        ready: true
      });
    });
  });

  it("モデル切り替え時は古いruntimeのdispose完了を待ってから次のruntimeを作る", async () => {
    let releaseDispose: (() => void) | null = null;
    const firstAnalyze = vi.fn().mockResolvedValue({
      candidates: [],
      summary: "ok",
      rawText: "",
      modelId: "first-model",
      elapsedMs: 1
    });
    const secondAnalyze = vi.fn().mockResolvedValue({
      candidates: [],
      summary: "ok",
      rawText: "",
      modelId: "second-model",
      elapsedMs: 1
    });
    const firstDispose = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          releaseDispose = resolve;
        })
    );
    const secondDispose = vi.fn();

    runtimeServiceFactoryMock
      .mockImplementationOnce(() => ({
        analyze: firstAnalyze,
        status: statusMock,
        prepare: vi.fn(),
        dispose: firstDispose
      }))
      .mockImplementationOnce(() => ({
        analyze: secondAnalyze,
        status: statusMock,
        prepare: vi.fn(),
        dispose: secondDispose
      }));

    const { messageHandler } = await loadBridgePage();
    const port = new FakeMessagePort();

    messageHandler({
      data: { type: LLM_BRIDGE_CONNECT, nonce: "expected-nonce" },
      ports: [port]
    } as MessageEvent<unknown>);

    port.dispatch({
      type: "analyze",
      requestId: "request-1",
      inputText: "本文です",
      modelId: "first-model",
      options: {}
    });

    await vi.waitFor(() => {
      expect(firstAnalyze).toHaveBeenCalled();
    });

    port.dispatch({
      type: "analyze",
      requestId: "request-2",
      inputText: "本文です",
      modelId: "second-model",
      options: {}
    });
    await Promise.resolve();

    expect(firstDispose).toHaveBeenCalled();
    expect(runtimeServiceFactoryMock).toHaveBeenCalledTimes(1);
    expect(secondAnalyze).not.toHaveBeenCalled();

    releaseDispose?.();

    await vi.waitFor(() => {
      expect(runtimeServiceFactoryMock).toHaveBeenCalledTimes(2);
      expect(secondAnalyze).toHaveBeenCalled();
    });
  });

  it.each([
    {
      name: "connect messageにnonceがない",
      hrefNonce: "expected-nonce",
      connectMessage: { type: LLM_BRIDGE_CONNECT }
    },
    {
      name: "connect messageのnonceが一致しない",
      hrefNonce: "expected-nonce",
      connectMessage: { type: LLM_BRIDGE_CONNECT, nonce: "wrong-nonce" }
    },
    {
      name: "bridge URLにnonceがない",
      hrefNonce: null,
      connectMessage: { type: LLM_BRIDGE_CONNECT, nonce: "expected-nonce" }
    }
  ])("$name とbridgePortを確立しない", async ({ hrefNonce, connectMessage }) => {
    const { messageHandler } = await loadBridgePage({ expectedNonce: hrefNonce });
    const port = new FakeMessagePort();

    messageHandler({
      data: connectMessage,
      ports: [port]
    } as MessageEvent<unknown>);

    expect(port.started).toBe(false);
    expect(port.postedMessages).toEqual([]);

    port.dispatch({
      type: "analyze",
      requestId: "request-ignored",
      inputText: "秘密本文",
      modelId: "test-model",
      options: {}
    });

    await Promise.resolve();
    expect(analyzeMock).not.toHaveBeenCalled();
  });

  it("bridge確立後の再接続を拒否する", async () => {
    analyzeMock.mockResolvedValue({
      candidates: [],
      summary: "ok",
      rawText: "",
      modelId: "test-model",
      elapsedMs: 3
    });

    const { messageHandler } = await loadBridgePage();
    const firstPort = new FakeMessagePort();
    const secondPort = new FakeMessagePort();

    messageHandler({
      data: { type: LLM_BRIDGE_CONNECT, nonce: "expected-nonce" },
      ports: [firstPort]
    } as MessageEvent<unknown>);
    messageHandler({
      data: { type: LLM_BRIDGE_CONNECT, nonce: "expected-nonce" },
      ports: [secondPort]
    } as MessageEvent<unknown>);

    expect(firstPort.started).toBe(true);
    expect(firstPort.postedMessages).toEqual([{ type: LLM_BRIDGE_READY }]);
    expect(secondPort.started).toBe(false);
    expect(secondPort.postedMessages).toEqual([]);

    firstPort.dispatch({
      type: "analyze",
      requestId: "request-after-connect",
      inputText: "再接続拒否後も正常処理",
      modelId: "test-model",
      options: {}
    });

    await vi.waitFor(() => {
      expect(analyzeMock).toHaveBeenCalledTimes(1);
    });
  });

  it("不正requestを拒否してユーザー本文をerror messageに含めない", async () => {
    const { messageHandler } = await loadBridgePage();
    const port = new FakeMessagePort();

    messageHandler({
      data: { type: LLM_BRIDGE_CONNECT, nonce: "expected-nonce" },
      ports: [port]
    } as MessageEvent<unknown>);

    port.dispatch({
      type: "analyze",
      requestId: "bad-request",
      inputText: "秘密本文",
      modelId: 123,
      options: {}
    });

    await vi.waitFor(() => {
      expect(port.postedMessages).toContainEqual({
        type: "error",
        requestId: "bad-request",
        message: "AI文脈チェック用のリクエスト形式が正しくありません。"
      });
    });
    expect(analyzeMock).not.toHaveBeenCalled();
  });

  it("analyze失敗時もユーザー本文をerror messageに含めない", async () => {
    analyzeMock.mockRejectedValue(new Error("秘密本文を含む内部エラー"));

    const { messageHandler } = await loadBridgePage();
    const port = new FakeMessagePort();

    messageHandler({
      data: { type: LLM_BRIDGE_CONNECT, nonce: "expected-nonce" },
      ports: [port]
    } as MessageEvent<unknown>);

    port.dispatch({
      type: "analyze",
      requestId: "request-error",
      inputText: "秘密本文",
      modelId: "test-model",
      options: {}
    });

    await vi.waitFor(() => {
      expect(port.postedMessages).toContainEqual({
        type: "error",
        requestId: "request-error",
        message: "AI文脈チェックを実行できませんでした。"
      });
    });
    expect(JSON.stringify(port.postedMessages)).not.toContain("秘密本文");
  });
});
