import {
  createLlmContextAnalyzer,
  type AnalyzeContextOptions,
  type LlmContextAnalyzer,
  type LlmProgress
} from "@ai-mae-check/llm";
import {
  getLlmBridgeExpectedNonce,
  getLlmBridgeRequestId,
  isLlmBridgeRequest,
  LLM_BRIDGE_READY,
  shouldAcceptLlmBridgeConnection,
  type LlmBridgeRequest,
  type LlmBridgeResponse
} from "./lib/llmBridgeMessages";
import { getExtensionResourceUrl } from "./lib/extensionRuntime";
import { createJsonParseBridgeFallbackResult } from "./lib/llmBridgeFallback";

const BRIDGE_EXECUTION_ERROR_MESSAGE = "AI文脈チェックを実行できませんでした。";
const BRIDGE_REQUEST_ERROR_MESSAGE = "AI文脈チェック用のリクエスト形式が正しくありません。";
const expectedBridgeNonce = getLlmBridgeExpectedNonce(window.location.href);

let bridgePort: MessagePort | null = null;
let bridgeConnected = false;
let analyzer: LlmContextAnalyzer | null = null;
let analyzerModelId: string | null = null;

function post(message: LlmBridgeResponse): void {
  bridgePort?.postMessage(message);
}

function postProgress(requestId: string): (progress: LlmProgress) => void {
  return (progress) => {
    post({
      type: "progress",
      requestId,
      progress
    });
  };
}

function getAnalyzer(modelId: string): LlmContextAnalyzer {
  if (analyzer && analyzerModelId === modelId) {
    return analyzer;
  }

  analyzer?.dispose();
  analyzer = createLlmContextAnalyzer({
    modelId,
    workerUrl: getExtensionResourceUrl("llm-worker.js")
  });
  analyzerModelId = modelId;
  return analyzer;
}

function isModelReady(modelId: string): boolean {
  return analyzerModelId === modelId && analyzer?.isReady() === true;
}

async function handleAnalyze(request: Extract<LlmBridgeRequest, { type: "analyze" }>): Promise<void> {
  const startedAt = performance.now();
  const currentAnalyzer = getAnalyzer(request.modelId);
  try {
    const options: AnalyzeContextOptions = {
      onProgress: postProgress(request.requestId)
    };
    if (request.options.existingFindings) {
      options.existingFindings = request.options.existingFindings;
    }
    if (typeof request.options.maxCandidates === "number") {
      options.maxCandidates = request.options.maxCandidates;
    }

    const result = await currentAnalyzer.analyze(request.inputText, options);

    post({
      type: "analyze-result",
      requestId: request.requestId,
      result
    });
  } catch (error) {
    const fallback = createJsonParseBridgeFallbackResult({
      inputText: request.inputText,
      modelId: request.modelId,
      startedAt,
      error,
      ...(typeof request.options.maxCandidates === "number" ? { maxCandidates: request.options.maxCandidates } : {})
    });

    if (fallback) {
      post({
        type: "analyze-result",
        requestId: request.requestId,
        result: fallback
      });
      return;
    }

    throw error;
  }
}

function handleModelState(request: Extract<LlmBridgeRequest, { type: "model-state" }>): void {
  post({
    type: "model-state-result",
    requestId: request.requestId,
    ready: isModelReady(request.modelId)
  });
}

async function handleRequest(request: LlmBridgeRequest): Promise<void> {
  try {
    if (request.type === "model-state") {
      handleModelState(request);
      return;
    }

    await handleAnalyze(request);
  } catch {
    post({
      type: "error",
      requestId: request.requestId,
      message: BRIDGE_EXECUTION_ERROR_MESSAGE
    });
  }
}

async function handlePortMessage(message: unknown): Promise<void> {
  if (!isLlmBridgeRequest(message)) {
    const requestId = getLlmBridgeRequestId(message);
    if (requestId) {
      post({
        type: "error",
        requestId,
        message: BRIDGE_REQUEST_ERROR_MESSAGE
      });
    }
    return;
  }

  await handleRequest(message);
}

window.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (
    !shouldAcceptLlmBridgeConnection({
      expectedNonce: expectedBridgeNonce,
      isConnected: bridgeConnected,
      message: event.data,
      portCount: event.ports.length
    })
  ) {
    return;
  }

  bridgePort = event.ports[0] ?? null;
  if (!bridgePort) {
    return;
  }
  bridgeConnected = true;

  bridgePort.onmessage = (portEvent: MessageEvent<unknown>) => {
    void handlePortMessage(portEvent.data);
  };
  bridgePort.start();
  post({ type: LLM_BRIDGE_READY });
});
