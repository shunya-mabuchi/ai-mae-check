import type { AnalyzeContextOptions } from "@ai-mae-check/llm";
import type { LlmBridgeRequest } from "./llmBridgeMessages";

export interface CreateLlmBridgeAnalyzeRequestOptions
  extends Pick<AnalyzeContextOptions, "maxCandidates"> {
  requestId: string;
  inputText: string;
}

export type LlmBridgeAnalyzeRequest = LlmBridgeRequest;

export function createLlmBridgeAnalyzeRequest(options: CreateLlmBridgeAnalyzeRequestOptions): LlmBridgeAnalyzeRequest {
  return {
    type: "analyze-context",
    requestId: options.requestId,
    inputText: options.inputText,
    options: {
      ...(typeof options.maxCandidates === "number" ? { maxCandidates: options.maxCandidates } : {})
    }
  };
}
