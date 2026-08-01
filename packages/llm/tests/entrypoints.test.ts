import { describe, expect, it } from "vitest";
import * as shared from "../src/index";

describe("@ai-mae-check/llm entrypoints", () => {
  it("root entryは共有ロジックだけを公開する", () => {
    expect(shared).toHaveProperty("classifyLlmError");
    expect(shared).not.toHaveProperty("createLocalLlmRuntimeService");
    expect(shared).not.toHaveProperty("createLlmContextAnalyzer");
  });

  it("runtime entryはWebLLM実行APIを公開する", async () => {
    const runtime = await import("../src/runtime");

    expect(runtime).toHaveProperty("createLocalLlmRuntimeService");
    expect(runtime).toHaveProperty("createLlmContextAnalyzer");
    expect(runtime).toHaveProperty("isWebGpuAvailable");
  });
});
