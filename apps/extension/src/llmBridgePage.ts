import type { LlmProgress } from "@ai-mae-check/llm";
import {
  getLlmBridgeExpectedNonce,
  getLlmBridgeRequestId,
  isLlmBridgeRequest,
  LLM_BRIDGE_READY,
  shouldAcceptLlmBridgeConnection,
  type LlmBridgeRequest,
  type LlmBridgeResponse
} from "./lib/llmBridgeMessages";
import {
  analyzeContextWithWasmWorker,
  disposeWasmContextWorker
} from "./lib/wasmContextWorkerClient";

const BRIDGE_EXECUTION_ERROR_MESSAGE =
  "CPU文脈チェックを実行できませんでした。ルールベースの検出結果は引き続き利用できます。";
const BRIDGE_REQUEST_ERROR_MESSAGE = "CPU文脈チェック用のリクエスト形式が正しくありません。";
const expectedBridgeNonce = getLlmBridgeExpectedNonce(window.location.href);

let bridgePort: MessagePort | null = null;
let bridgeConnected = false;
let analyzeQueue: Promise<void> = Promise.resolve();

function post(message: LlmBridgeResponse): void {
  bridgePort?.postMessage(message);
}

function postProgress(requestId: string): (progress: LlmProgress) => void {
  return (progress) => post({ type: "progress", requestId, progress });
}

async function handleRequest(request: LlmBridgeRequest): Promise<void> {
  try {
    const result = await analyzeContextWithWasmWorker(request.inputText, {
      ...(typeof request.options.maxCandidates === "number"
        ? { maxCandidates: request.options.maxCandidates }
        : {}),
      onProgress: postProgress(request.requestId)
    });
    post({ type: "analyze-result", requestId: request.requestId, result });
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
      post({ type: "error", requestId, message: BRIDGE_REQUEST_ERROR_MESSAGE });
    }
    return;
  }

  await handleRequest(message);
}

function enqueuePortMessage(message: unknown): void {
  analyzeQueue = analyzeQueue.then(
    () => handlePortMessage(message),
    () => handlePortMessage(message)
  );
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
    enqueuePortMessage(portEvent.data);
  };
  bridgePort.start();
  post({ type: LLM_BRIDGE_READY });
});

window.addEventListener("pagehide", () => {
  disposeWasmContextWorker();
});
