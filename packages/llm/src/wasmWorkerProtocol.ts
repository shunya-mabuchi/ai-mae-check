import type { ContextAnalysisResult, LlmProgress } from "./types";

export interface WasmContextAnalyzeRequest {
  type: "analyze";
  requestId: string;
  input: string;
  maxCandidates?: number;
}

export type WasmContextWorkerRequest = WasmContextAnalyzeRequest;

export type WasmContextWorkerResponse =
  | {
      type: "progress";
      requestId: string;
      progress: LlmProgress;
    }
  | {
      type: "result";
      requestId: string;
      result: ContextAnalysisResult;
    }
  | {
      type: "error";
      requestId: string;
      message: string;
    };

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isWasmContextWorkerRequest(value: unknown): value is WasmContextWorkerRequest {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    value.type === "analyze" &&
    typeof value.requestId === "string" &&
    value.requestId.length > 0 &&
    typeof value.input === "string" &&
    (value.maxCandidates === undefined || typeof value.maxCandidates === "number")
  );
}
