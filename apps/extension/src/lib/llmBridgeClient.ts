import type {
  AnalyzeContextOptions,
  AnalyzeSanitizeOptions,
  ContextAnalysisResult,
  LlmProgress,
  SanitizeAnalysisResult
} from "@ai-mae-check/llm";
import {
  LLM_BRIDGE_CONNECT,
  LLM_BRIDGE_READY,
  type LlmBridgeRequest,
  type LlmBridgeResponse
} from "./llmBridgeMessages";
import { getExtensionResourceUrl } from "./extensionRuntime";

interface BridgeConnection {
  port: MessagePort;
}

interface PendingRequest<T> {
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
  onProgress?: (progress: LlmProgress) => void;
}

interface BridgeAnalyzeOptions extends Pick<AnalyzeContextOptions, "existingFindings" | "maxCandidates" | "onProgress"> {
  modelId: string;
}

interface BridgeSanitizeOptions extends Pick<AnalyzeSanitizeOptions, "existingFindings" | "mode" | "onProgress"> {
  modelId: string;
}

const BRIDGE_PAGE = "llm-bridge.html";
const BRIDGE_LOAD_TIMEOUT_MS = 15000;

let bridgePromise: Promise<BridgeConnection> | null = null;
let requestSeq = 0;
const pendingRequests = new Map<string, PendingRequest<ContextAnalysisResult | SanitizeAnalysisResult>>();

function nextRequestId(): string {
  requestSeq += 1;
  return `llm-${Date.now()}-${requestSeq}`;
}

function createBridgeIframe(): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.title = "AIまえチェック AI文脈チェック";
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = [
    "position: fixed",
    "width: 0",
    "height: 0",
    "border: 0",
    "opacity: 0",
    "pointer-events: none",
    "left: -9999px",
    "top: -9999px"
  ].join(";");
  return iframe;
}

function waitForIframeLoad(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("AI文脈チェック用の拡張ページを準備できませんでした。"));
    }, BRIDGE_LOAD_TIMEOUT_MS);

    iframe.addEventListener(
      "load",
      () => {
        window.clearTimeout(timeout);
        resolve();
      },
      { once: true }
    );
  });
}

function handleBridgeMessage(message: LlmBridgeResponse): void {
  if (message.type === "ready") {
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
  const iframe = createBridgeIframe();
  const loadPromise = waitForIframeLoad(iframe);
  iframe.src = getExtensionResourceUrl(BRIDGE_PAGE);
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
      if (event.data.type === "ready") {
        window.clearTimeout(timeout);
        resolve();
        return;
      }

      handleBridgeMessage(event.data);
    };
  });

  contentWindow.postMessage({ type: LLM_BRIDGE_CONNECT }, bridgeOrigin, [channel.port2]);
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

async function sendBridgeRequest<T extends ContextAnalysisResult | SanitizeAnalysisResult>(
  request: LlmBridgeRequest,
  onProgress?: (progress: LlmProgress) => void
): Promise<T> {
  const bridge = await getBridgeConnection();

  return new Promise<T>((resolve, reject) => {
    const pending: PendingRequest<ContextAnalysisResult | SanitizeAnalysisResult> = {
      resolve: (value) => resolve(value as T),
      reject
    };
    if (onProgress) {
      pending.onProgress = onProgress;
    }
    pendingRequests.set(request.requestId, pending);
    bridge.port.postMessage(request);
  });
}

export function analyzeContextWithBridge(inputText: string, options: BridgeAnalyzeOptions): Promise<ContextAnalysisResult> {
  const request: LlmBridgeRequest = {
    type: "analyze",
    requestId: nextRequestId(),
    inputText,
    modelId: options.modelId,
    options: {
      ...(options.existingFindings ? { existingFindings: options.existingFindings } : {}),
      ...(typeof options.maxCandidates === "number" ? { maxCandidates: options.maxCandidates } : {})
    }
  };

  return sendBridgeRequest(request, options.onProgress);
}

export function analyzeSanitizeWithBridge(inputText: string, options: BridgeSanitizeOptions): Promise<SanitizeAnalysisResult> {
  const request: LlmBridgeRequest = {
    type: "sanitize",
    requestId: nextRequestId(),
    inputText,
    modelId: options.modelId,
    options: {
      ...(options.existingFindings ? { existingFindings: options.existingFindings } : {}),
      ...(options.mode ? { mode: options.mode } : {})
    }
  };

  return sendBridgeRequest(request, options.onProgress);
}
