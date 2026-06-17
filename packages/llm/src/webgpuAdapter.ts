import { classifyLlmError } from "./errors";
import type { LlmErrorDetail } from "./types";
import { isWebGpuAvailable } from "./webgpu";

type NavigatorWithGpu = Navigator & {
  gpu?: {
    requestAdapter(options?: { powerPreference?: "low-power" | "high-performance" }): Promise<unknown | null>;
  };
};

export async function ensureWebGpuAdapter(): Promise<LlmErrorDetail | null> {
  if (!isWebGpuAvailable()) {
    return classifyLlmError(new Error("navigator.gpu is not available"));
  }

  try {
    const adapter = await (navigator as NavigatorWithGpu).gpu?.requestAdapter({ powerPreference: "high-performance" });
    if (!adapter) {
      // iframe側の事前チェックだけで失敗しても、Worker側では取得できる場合があるためWebLLM本体に任せます。
      return null;
    }
  } catch (error) {
    return classifyLlmError(error);
  }

  return null;
}
