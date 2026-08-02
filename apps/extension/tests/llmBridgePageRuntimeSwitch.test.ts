import { afterEach, describe, expect, it, vi } from "vitest";
import { LLM_BRIDGE_CONNECT } from "../src/lib/llmBridgeMessages";

const statusMock = vi.fn(() => ({
  phase: "idle",
  ready: false,
  modelId: "test-model",
  message: "AI文脈チェックは未準備です。"
}));
const runtimeServiceFactoryMock = vi.fn();
const createLocalLlmRuntimeServiceMock = vi.fn((...args: unknown[]) => runtimeServiceFactoryMock(...args));

vi.mock("@ai-mae-check/llm/runtime", () => ({
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

  postMessage(message: unknown): void {
    this.postedMessages.push(message);
  }

  start(): void {}

  dispatch(message: unknown): void {
    this.onmessage?.({ data: message } as MessageEvent<unknown>);
  }
}

async function loadBridgePage() {
  vi.resetModules();

  let messageHandler: ((event: MessageEvent<unknown>) => void) | null = null;
  vi.stubGlobal("window", {
    location: { href: "chrome-extension://test/llm-bridge.html?nonce=expected-nonce" },
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

  return messageHandler;
}

describe("llmBridgePageのGPU障害後モデル切り替え", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    runtimeServiceFactoryMock.mockReset();
    createLocalLlmRuntimeServiceMock.mockClear();
  });

  it("古いruntimeのdisposeが失敗しても次のruntimeへ切り替える", async () => {
    const firstAnalyze = vi.fn().mockResolvedValue({
      candidates: [],
      summary: "GPU実行に失敗しました。",
      rawText: "",
      modelId: "first-model",
      elapsedMs: 1,
      error: "ローカルAIモデルのGPU実行が中断されました。"
    });
    const secondAnalyze = vi.fn().mockResolvedValue({
      candidates: [],
      summary: "ok",
      rawText: "",
      modelId: "second-model",
      elapsedMs: 1
    });
    const firstDispose = vi.fn().mockRejectedValue(new Error("Object has already been disposed"));

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
        dispose: vi.fn()
      }));

    const messageHandler = await loadBridgePage();
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
    await vi.waitFor(() => expect(firstAnalyze).toHaveBeenCalled());

    port.dispatch({
      type: "analyze",
      requestId: "request-2",
      inputText: "本文です",
      modelId: "second-model",
      options: {}
    });

    await vi.waitFor(() => {
      expect(firstDispose).toHaveBeenCalled();
      expect(secondAnalyze).toHaveBeenCalled();
      expect(port.postedMessages).toContainEqual(
        expect.objectContaining({ type: "analyze-result", requestId: "request-2" })
      );
    });
  });
});
