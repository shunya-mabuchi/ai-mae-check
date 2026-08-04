import { describe, expect, it } from "vitest";
import * as shared from "../src/index";

describe("@ai-mae-check/llm entrypoints", () => {
  it("root entryは共有ロジックだけを公開する", () => {
    expect(shared).toHaveProperty("classifyLlmError");
    expect(shared).not.toHaveProperty("createLocalLlmRuntimeService");
    expect(shared).not.toHaveProperty("createLlmContextAnalyzer");
  });

  it("wasm-worker entryはCPU上の解析Worker APIだけを公開する", async () => {
    const runtime = await import("../src/wasm-worker");

    expect(runtime).toHaveProperty("startWasmContextWorker");
    expect(runtime).not.toHaveProperty("createLlmContextAnalyzer");
    expect(runtime).not.toHaveProperty("isWebGpuAvailable");
  });
});
