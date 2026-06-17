import { createLlmContextAnalyzer, type AnalyzeContextOptions, type LlmProgress } from "@ai-mae-check/llm";
import {
  LLM_BRIDGE_CONNECT,
  type LlmBridgeRequest,
  type LlmBridgeResponse
} from "./lib/llmBridgeMessages";
import { getExtensionResourceUrl } from "./lib/extensionRuntime";
import { createJsonParseBridgeFallbackResult } from "./lib/llmBridgeFallback";

let bridgePort: MessagePort | null = null;

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

async function handleAnalyze(request: Extract<LlmBridgeRequest, { type: "analyze" }>): Promise<void> {
  const startedAt = performance.now();
  const analyzer = createLlmContextAnalyzer({
    modelId: request.modelId,
    workerUrl: getExtensionResourceUrl("llm-worker.js")
  });

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

    const result = await analyzer.analyze(request.inputText, options);

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
  } finally {
    analyzer.dispose();
  }
}

async function handleRequest(request: LlmBridgeRequest): Promise<void> {
  try {
    await handleAnalyze(request);
  } catch (error) {
    post({
      type: "error",
      requestId: request.requestId,
      message: error instanceof Error ? error.message : "AI文脈チェックを実行できませんでした。"
    });
  }
}

window.addEventListener("message", (event: MessageEvent<{ type?: string }>) => {
  if (event.data?.type !== LLM_BRIDGE_CONNECT || event.ports.length === 0) {
    return;
  }

  bridgePort = event.ports[0] ?? null;
  if (!bridgePort) {
    return;
  }

  bridgePort.onmessage = (portEvent: MessageEvent<LlmBridgeRequest>) => {
    void handleRequest(portEvent.data);
  };
  bridgePort.start();
  post({ type: "ready" });
});
