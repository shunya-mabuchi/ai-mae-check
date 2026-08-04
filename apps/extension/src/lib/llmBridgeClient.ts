import type {
  AnalyzeContextOptions,
  ContextAnalysisResult,
  LlmProgress
} from "@ai-mae-check/llm";
import {
  createLlmBridgeConnectMessage,
  LLM_BRIDGE_READY,
  type LlmBridgeRequest,
  type LlmBridgeResponse
} from "./llmBridgeMessages";
import { getExtensionResourceUrl } from "./extensionRuntime";
import {
  BRIDGE_LOAD_TIMEOUT_MS,
  createLlmBridgeNonce,
  createLlmBridgePageUrl,
  createLlmBridgeIframe,
  waitForLlmBridgeIframeLoad
} from "./llmBridgeFrame";
import { createLlmBridgeAnalyzeRequest } from "./llmBridgeRequest";

interface BridgeConnection {
  port: MessagePort;
}

interface PendingRequest<T> {
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
  request: LlmBridgeRequest;
  startedAt: number;
  onProgress?: (progress: LlmProgress) => void;
}

interface BridgeAnalyzeOptions extends Pick<AnalyzeContextOptions, "maxCandidates" | "onProgress"> {}

const BRIDGE_PAGE = "llm-bridge.html";

let bridgePromise: Promise<BridgeConnection> | null = null;
let requestSeq = 0;
type BridgeResult = ContextAnalysisResult;

const pendingRequests = new Map<string, PendingRequest<BridgeResult>>();

function nextRequestId(): string {
  requestSeq += 1;
  return `llm-${Date.now()}-${requestSeq}`;
}

function handleBridgeMessage(message: LlmBridgeResponse): void {
  if (message.type === LLM_BRIDGE_READY) {
    return;
  }

  const pending = pendingRequests.get(message.requestId);
  if (!pending) {
    return;
  }

  if (message.type === "progress") {
    pending.onProgress?.(message.progress);
    return;
  }

  pendingRequests.delete(message.requestId);

  if (message.type === "error") {
    pending.reject(new Error(message.message));
    return;
  }

  pending.resolve(message.result);
}

async function createBridgeConnection(): Promise<BridgeConnection> {
  const iframe = createLlmBridgeIframe();
  const loadPromise = waitForLlmBridgeIframeLoad(iframe);
  const bridgeNonce = createLlmBridgeNonce();
  iframe.src = createLlmBridgePageUrl(getExtensionResourceUrl(BRIDGE_PAGE), bridgeNonce);
  document.documentElement.append(iframe);
  await loadPromise;

  const contentWindow = iframe.contentWindow;
  if (!contentWindow) {
    throw new Error("AI文脈チェック用の拡張ページを起動できませんでした。");
  }

  const bridgeOrigin = new URL(iframe.src).origin;
  const channel = new MessageChannel();
  const port = channel.port1;
  const ready = new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("AI文脈チェック用の拡張ページが応答しませんでした。"));
    }, BRIDGE_LOAD_TIMEOUT_MS);

    port.onmessage = (event: MessageEvent<LlmBridgeResponse>) => {
      if (event.data.type === LLM_BRIDGE_READY) {
        window.clearTimeout(timeout);
        resolve();
        return;
      }

      handleBridgeMessage(event.data);
    };
  });

  contentWindow.postMessage(createLlmBridgeConnectMessage(bridgeNonce), bridgeOrigin, [channel.port2]);
  port.start();
  await ready;

  return { port };
}

function getBridgeConnection(): Promise<BridgeConnection> {
  bridgePromise ??= createBridgeConnection().catch((error) => {
    bridgePromise = null;
    throw error;
  });
  return bridgePromise;
}

async function sendBridgeRequest<T extends ContextAnalysisResult>(
  request: LlmBridgeRequest,
  onProgress?: (progress: LlmProgress) => void
): Promise<T> {
  const bridge = await getBridgeConnection();

  return new Promise<T>((resolve, reject) => {
    const pending: PendingRequest<BridgeResult> = {
      resolve: (value) => resolve(value as T),
      reject,
      request,
      startedAt: performance.now()
    };
    if (onProgress) {
      pending.onProgress = onProgress;
    }
    pendingRequests.set(request.requestId, pending);
    bridge.port.postMessage(request);
  });
}

export function analyzeContextWithBridge(inputText: string, options: BridgeAnalyzeOptions): Promise<ContextAnalysisResult> {
  const request = createLlmBridgeAnalyzeRequest({
    requestId: nextRequestId(),
    inputText,
    ...(typeof options.maxCandidates === "number" ? { maxCandidates: options.maxCandidates } : {})
  });

  return sendBridgeRequest(request, options.onProgress);
}
