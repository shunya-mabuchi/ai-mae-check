import type {
  LlmAnalyzerOptions,
  LocalLlmRuntimeService
} from "@ai-mae-check/llm";

export async function createDemoLlmRuntimeService(
  options?: LlmAnalyzerOptions
): Promise<LocalLlmRuntimeService> {
  const { createLocalLlmRuntimeService } = await import(
    "@ai-mae-check/llm/runtime"
  );
  return createLocalLlmRuntimeService(options);
}
