import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureWebGpuAdapter } from "../src/webgpuAdapter";

describe("ensureWebGpuAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("navigator.gpuがなければWebGPUエラー詳細を返す", async () => {
    vi.stubGlobal("navigator", {});

    const detail = await ensureWebGpuAdapter();

    expect(detail?.kind).toBe("webgpu");
    expect(detail?.message).toContain("AI文脈チェックを利用できません");
    expect(detail?.technicalDetail).toContain("navigator.gpu is not available");
  });

  it("requestAdapterがnullならWebLLM本体に任せるためnullを返す", async () => {
    const requestAdapter = vi.fn(async () => null);
    vi.stubGlobal("navigator", { gpu: { requestAdapter } });

    const detail = await ensureWebGpuAdapter();

    expect(detail).toBeNull();
    expect(requestAdapter).toHaveBeenCalledWith({ powerPreference: "high-performance" });
  });

  it("requestAdapterが失敗したら分類済みのWebGPUエラー詳細を返す", async () => {
    const requestAdapter = vi.fn(async () => {
      throw new Error("requestAdapter failed");
    });
    vi.stubGlobal("navigator", { gpu: { requestAdapter } });

    const detail = await ensureWebGpuAdapter();

    expect(detail?.kind).toBe("webgpu");
    expect(detail?.message).toContain("WebGPUアダプタを取得できません");
    expect(detail?.technicalDetail).toContain("requestAdapter failed");
  });
});
