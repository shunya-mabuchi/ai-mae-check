import { createWasmContextAnalyzer } from "./wasmAnalyzer";
import type { LlmContextAnalyzer } from "./types";
import {
  isWasmContextWorkerRequest,
  type WasmContextWorkerResponse
} from "./wasmWorkerProtocol";

interface WasmWorkerScope {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(message: WasmContextWorkerResponse): void;
}

export interface StartWasmContextWorkerOptions {
  wasmRootUrl: string;
  scope?: WasmWorkerScope;
}

const WORKER_REQUEST_ERROR_MESSAGE = "CPU文脈チェックのリクエスト形式が正しくありません。";

export function startWasmContextWorker(options: StartWasmContextWorkerOptions): void {
  const scope = options.scope ?? (self as unknown as WasmWorkerScope);
  let analyzer: LlmContextAnalyzer | null = null;
  let queue: Promise<void> = Promise.resolve();

  const getAnalyzer = (): LlmContextAnalyzer => {
    analyzer ??= createWasmContextAnalyzer({ wasmRootUrl: options.wasmRootUrl });
    return analyzer;
  };

  const handleMessage = async (event: MessageEvent<unknown>): Promise<void> => {
    if (!isWasmContextWorkerRequest(event.data)) {
      const requestId =
        typeof event.data === "object" &&
        event.data !== null &&
        "requestId" in event.data &&
        typeof event.data.requestId === "string"
          ? event.data.requestId
          : "unknown";
      scope.postMessage({
        type: "error",
        requestId,
        message: WORKER_REQUEST_ERROR_MESSAGE
      });
      return;
    }

    const request = event.data;
    try {
      const result = await getAnalyzer().analyze(request.input, {
        ...(typeof request.maxCandidates === "number"
          ? { maxCandidates: request.maxCandidates }
          : {}),
        onProgress: (progress) => {
          scope.postMessage({
            type: "progress",
            requestId: request.requestId,
            progress
          });
        }
      });
      scope.postMessage({
        type: "result",
        requestId: request.requestId,
        result
      });
    } catch {
      scope.postMessage({
        type: "error",
        requestId: request.requestId,
        message: "CPU文脈チェックを実行できませんでした。"
      });
    }
  };

  scope.onmessage = (event) => {
    queue = queue.then(
      () => handleMessage(event),
      () => handleMessage(event)
    );
  };
}
