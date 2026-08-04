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

describe("llmBridgePageのGPU障害後プロファイル切り替え", () => {
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
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "standard",
      options: {}
    });
    await vi.waitFor(() => expect(firstAnalyze).toHaveBeenCalled());

    port.dispatch({
      type: "analyze",
      requestId: "request-2",
      inputText: "本文です",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "low_resource",
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

  it("古いruntimeのdispose完了を待って低負荷プロファイルへ切り替える", async () => {
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
      requestId: "request-standard",
      inputText: "本文です",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "standard",
      options: {}
    });
    await vi.waitFor(() => expect(firstAnalyze).toHaveBeenCalled());

    port.dispatch({
      type: "analyze",
      requestId: "request-low-resource",
      inputText: "本文です",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "low_resource",
      options: { maxCandidates: 12 }
    });
    await Promise.resolve();

    expect(firstDispose).toHaveBeenCalled();
    expect(runtimeServiceFactoryMock).toHaveBeenCalledTimes(1);
    expect(secondAnalyze).not.toHaveBeenCalled();

    releaseDispose?.();

    await vi.waitFor(() => {
      expect(runtimeServiceFactoryMock).toHaveBeenCalledTimes(2);
      expect(secondAnalyze).toHaveBeenCalledWith(expect.objectContaining({ maxCandidates: 6 }));
    });
    expect(createLocalLlmRuntimeServiceMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        modelId: "gemma3-1b-it-q4f16_1-MLC",
        contextWindowSize: 1536,
        maxInputChars: 800,
        maxTokens: 256,
        compactPrompt: true
      })
    );
  });

  it("同一プロファイルでもerror状態のruntimeを破棄して作り直す", async () => {
    const firstAnalyze = vi.fn().mockResolvedValue({
      candidates: [],
      summary: "GPU実行が中断されました。",
      rawText: "",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      elapsedMs: 1,
      error: "GPU実行が中断されました。",
      errorDetail: {
        kind: "webgpu",
        message: "GPU実行が中断されました。",
        hint: "低負荷で再試行してください。",
        technicalDetail: "Object has already been disposed"
      }
    });
    const secondAnalyze = vi.fn().mockResolvedValue({
      candidates: [],
      summary: "ok",
      rawText: "{}",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      elapsedMs: 1
    });
    const firstDispose = vi.fn().mockResolvedValue(undefined);

    runtimeServiceFactoryMock
      .mockImplementationOnce(() => ({
        analyze: firstAnalyze,
        status: vi.fn(() => ({
          phase: "error",
          ready: false,
          modelId: "gemma3-1b-it-q4f16_1-MLC",
          message: "GPU実行が中断されました。"
        })),
        prepare: vi.fn(),
        dispose: firstDispose
      }))
      .mockImplementationOnce(() => ({
        analyze: secondAnalyze,
        status: vi.fn(() => ({
          phase: "idle",
          ready: false,
          modelId: "gemma3-1b-it-q4f16_1-MLC",
          message: "未準備です。"
        })),
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
      requestId: "request-error",
      inputText: "本文です。",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "standard",
      options: {}
    });
    await vi.waitFor(() => expect(firstAnalyze).toHaveBeenCalledOnce());

    port.dispatch({
      type: "analyze",
      requestId: "request-retry",
      inputText: "本文です。",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "standard",
      options: {}
    });

    await vi.waitFor(() => {
      expect(firstDispose).toHaveBeenCalledOnce();
      expect(secondAnalyze).toHaveBeenCalledOnce();
    });
    expect(runtimeServiceFactoryMock).toHaveBeenCalledTimes(2);
  });

  it("同時に届いた解析要求を同じruntimeで直列実行する", async () => {
    let finishFirst: (() => void) | null = null;
    const analyze = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishFirst = () => resolve({
              candidates: [],
              summary: "first",
              rawText: "{}",
              modelId: "gemma3-1b-it-q4f16_1-MLC",
              elapsedMs: 1
            });
          })
      )
      .mockResolvedValueOnce({
        candidates: [],
        summary: "second",
        rawText: "{}",
        modelId: "gemma3-1b-it-q4f16_1-MLC",
        elapsedMs: 1
      });

    runtimeServiceFactoryMock.mockImplementationOnce(() => ({
      analyze,
      status: vi.fn(() => ({
        phase: "ready",
        ready: true,
        modelId: "gemma3-1b-it-q4f16_1-MLC",
        message: "準備済みです。"
      })),
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
      requestId: "request-first",
      inputText: "一つ目の本文です。",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "standard",
      options: {}
    });
    port.dispatch({
      type: "analyze",
      requestId: "request-second",
      inputText: "二つ目の本文です。",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "standard",
      options: {}
    });
    await vi.waitFor(() => expect(analyze).toHaveBeenCalledTimes(1));
    port.dispatch({
      type: "model-state",
      requestId: "state-during-analysis",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "standard",
      options: {}
    });
    expect(port.postedMessages).toContainEqual({
      type: "model-state-result",
      requestId: "state-during-analysis",
      ready: true
    });
    finishFirst?.();

    await vi.waitFor(() => expect(analyze).toHaveBeenCalledTimes(2));
    expect(port.postedMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ requestId: "request-first", type: "analyze-result" }),
        expect.objectContaining({ requestId: "request-second", type: "analyze-result" })
      ])
    );
  });
});
