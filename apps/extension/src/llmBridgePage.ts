import {
  type AnalyzeContextOptions,
  getLlmExecutionProfile,
  type LocalLlmRuntimeService,
  type LlmExecutionProfileId,
  type LlmProgress
} from "@ai-mae-check/llm";
import { createLocalLlmRuntimeService } from "@ai-mae-check/llm/runtime";
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
let runtimeService: LocalLlmRuntimeService | null = null;
let runtimeModelId: string | null = null;
let runtimeProfileId: LlmExecutionProfileId | null = null;

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

async function getRuntimeService(profileId: LlmExecutionProfileId): Promise<LocalLlmRuntimeService> {
  const profile = getLlmExecutionProfile(profileId);
  if (runtimeService && runtimeModelId === profile.modelId && runtimeProfileId === profile.id) {
    return runtimeService;
  }

  const previousRuntimeService = runtimeService;
  runtimeService = null;
  runtimeModelId = null;
  runtimeProfileId = null;

  try {
    await previousRuntimeService?.dispose();
  } catch {
    // GPUデバイス喪失後は破棄も失敗し得るため、新しいWorkerの起動を優先する。
  }

  runtimeService = createLocalLlmRuntimeService({
    modelId: profile.modelId,
    contextWindowSize: profile.contextWindowSize,
    maxInputChars: profile.maxInputChars,
    maxTokens: profile.maxTokens,
    compactPrompt: profile.compactPrompt,
    workerUrl: getExtensionResourceUrl("llm-worker.js")
  });
  runtimeModelId = profile.modelId;
  runtimeProfileId = profile.id;
  return runtimeService;
}

function isModelReady(modelId: string, profileId: LlmExecutionProfileId): boolean {
  return runtimeModelId === modelId && runtimeProfileId === profileId && runtimeService?.status().ready === true;
}

async function handleAnalyze(request: Extract<LlmBridgeRequest, { type: "analyze" }>): Promise<void> {
  const startedAt = performance.now();
  const profile = getLlmExecutionProfile(request.profileId);
  const currentRuntimeService = await getRuntimeService(request.profileId);
  const maxCandidates = Math.min(
    request.options.maxCandidates ?? profile.maxCandidates,
    profile.maxCandidates
  );
  try {
    const options: AnalyzeContextOptions = {
      onProgress: postProgress(request.requestId)
    };
    if (request.options.existingFindings) {
      options.existingFindings = request.options.existingFindings;
    }
    options.maxCandidates = maxCandidates;

    const result = await currentRuntimeService.analyze({
      input: request.inputText,
      ...options
    });

    post({
      type: "analyze-result",
      requestId: request.requestId,
      result
    });
  } catch (error) {
    const fallback = createJsonParseBridgeFallbackResult({
      inputText: request.inputText,
      modelId: profile.modelId,
      startedAt,
      error,
      maxCandidates
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
    ready: isModelReady(request.modelId, request.profileId)
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

window.addEventListener("pagehide", () => {
  const currentRuntimeService = runtimeService;
  runtimeService = null;
  runtimeModelId = null;
  runtimeProfileId = null;
  if (currentRuntimeService) {
    void Promise.resolve()
      .then(() => currentRuntimeService.dispose())
      .catch(() => {
        // ページ破棄時は、既に失われたGPUデバイスの解放失敗を画面へ伝える必要はない。
      });
  }
});
