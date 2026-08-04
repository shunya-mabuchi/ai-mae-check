import type { ContextAnalysisResult, LlmProgress } from "@ai-mae-check/llm";
import type {
  WasmContextWorkerRequest,
  WasmContextWorkerResponse
} from "@ai-mae-check/llm/wasm-worker";

interface PendingRequest {
  resolve: (result: ContextAnalysisResult) => void;
  reject: (reason?: unknown) => void;
  onProgress?: (progress: LlmProgress) => void;
}

let worker: Worker | null = null;
let requestSequence = 0;
const pendingRequests = new Map<string, PendingRequest>();

function rejectPending(message: string): void {
  for (const pending of pendingRequests.values()) pending.reject(new Error(message));
  pendingRequests.clear();
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("../workers/context-worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<WasmContextWorkerResponse>) => {
    const pending = pendingRequests.get(event.data.requestId);
    if (!pending) return;
    if (event.data.type === "progress") {
      pending.onProgress?.(event.data.progress);
      return;
    }
    pendingRequests.delete(event.data.requestId);
    if (event.data.type === "error") {
      pending.reject(new Error(event.data.message));
      return;
    }
    pending.resolve(event.data.result);
  };
  worker.onerror = () => {
    rejectPending("CPU文脈チェック用のWorkerを起動できませんでした。");
    worker?.terminate();
    worker = null;
  };
  return worker;
}

export function analyzeDemoContext(
  input: string,
  onProgress?: (progress: LlmProgress) => void
): Promise<ContextAnalysisResult> {
  const requestId = `site-context-${Date.now()}-${++requestSequence}`;
  const request: WasmContextWorkerRequest = { type: "analyze", requestId, input, maxCandidates: 12 };
  return new Promise((resolve, reject) => {
    pendingRequests.set(requestId, { resolve, reject, ...(onProgress ? { onProgress } : {}) });
    getWorker().postMessage(request);
  });
}

export function disposeDemoContextWorker(): void {
  worker?.terminate();
  worker = null;
  rejectPending("CPU文脈チェックを終了しました。");
}
