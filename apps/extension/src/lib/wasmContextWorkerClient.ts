import type {
  ContextAnalysisResult,
  LlmProgress
} from "@ai-mae-check/llm";
import type {
  WasmContextWorkerRequest,
  WasmContextWorkerResponse
} from "@ai-mae-check/llm/wasm-worker";
import { getExtensionResourceUrl } from "./extensionRuntime";

interface PendingWasmRequest {
  resolve: (result: ContextAnalysisResult) => void;
  reject: (reason?: unknown) => void;
  onProgress?: (progress: LlmProgress) => void;
}

export interface AnalyzeContextWithWasmWorkerOptions {
  maxCandidates?: number;
  onProgress?: (progress: LlmProgress) => void;
}

const WORKER_RESOURCE = "wasm-context-worker.js";
const WORKER_ERROR_MESSAGE = "CPU文脈チェック用のWorkerを起動できませんでした。";

let worker: Worker | null = null;
let requestSequence = 0;
const pendingRequests = new Map<string, PendingWasmRequest>();

function rejectPendingRequests(message: string): void {
  for (const pending of pendingRequests.values()) {
    pending.reject(new Error(message));
  }
  pendingRequests.clear();
}

function resetWorker(message?: string): void {
  worker?.terminate();
  worker = null;
  if (message) {
    rejectPendingRequests(message);
  }
}

function handleWorkerMessage(message: WasmContextWorkerResponse): void {
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

function getWorker(): Worker {
  if (worker) {
    return worker;
  }

  worker = new Worker(getExtensionResourceUrl(WORKER_RESOURCE), { type: "module" });
  worker.onmessage = (event: MessageEvent<WasmContextWorkerResponse>) => {
    handleWorkerMessage(event.data);
  };
  worker.onerror = () => {
    resetWorker(WORKER_ERROR_MESSAGE);
  };
  worker.onmessageerror = () => {
    resetWorker(WORKER_ERROR_MESSAGE);
  };
  return worker;
}

export function analyzeContextWithWasmWorker(
  input: string,
  options: AnalyzeContextWithWasmWorkerOptions = {}
): Promise<ContextAnalysisResult> {
  requestSequence += 1;
  const requestId = `wasm-${Date.now()}-${requestSequence}`;
  const request: WasmContextWorkerRequest = {
    type: "analyze",
    requestId,
    input,
    ...(typeof options.maxCandidates === "number"
      ? { maxCandidates: options.maxCandidates }
      : {})
  };

  return new Promise((resolve, reject) => {
    const pending: PendingWasmRequest = { resolve, reject };
    if (options.onProgress) {
      pending.onProgress = options.onProgress;
    }
    pendingRequests.set(requestId, pending);

    try {
      getWorker().postMessage(request);
    } catch {
      pendingRequests.delete(requestId);
      resetWorker();
      reject(new Error(WORKER_ERROR_MESSAGE));
    }
  });
}

export function disposeWasmContextWorker(): void {
  resetWorker("CPU文脈チェック用のページが終了しました。");
}
