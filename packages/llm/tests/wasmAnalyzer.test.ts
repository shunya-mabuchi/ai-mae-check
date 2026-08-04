import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  WASM_CONTEXT_MODEL_DTYPE,
  WASM_CONTEXT_MODEL_ID,
  WASM_CONTEXT_MODEL_REVISION
} from "../src";
import { createWasmContextAnalyzer } from "../src/wasmAnalyzer";

const mocks = vi.hoisted(() => {
  const dispose = vi.fn(async () => undefined);
  const extractor = Object.assign(
    vi.fn(async (texts: string[]) => ({
      tolist: () =>
        texts.length === 6
          ? Array.from({ length: 6 }, (_, index) =>
              Array.from({ length: 6 }, (_, current) => (index === current ? 1 : 0))
            )
          : texts.map(() => [0, 1, 0, 0, 0, 0])
    })),
    { dispose }
  );
  return {
    dispose,
    extractor,
    pipeline: vi.fn(async () => extractor),
    env: {
      allowLocalModels: true,
      allowRemoteModels: false,
      useBrowserCache: false,
      backends: {
        onnx: {
          wasm: {}
        }
      }
    }
  };
});

vi.mock("@huggingface/transformers", () => ({
  env: mocks.env,
  pipeline: mocks.pipeline
}));

describe("createWasmContextAnalyzer", () => {
  beforeEach(() => {
    mocks.pipeline.mockClear();
    mocks.extractor.mockClear();
    mocks.dispose.mockClear();
  });

  it("固定revisionのq8モデルをWASMで読み込み、本文を保存せず候補を返す", async () => {
    const analyzer = createWasmContextAnalyzer({
      wasmRootUrl: "chrome-extension://test/"
    });
    const result = await analyzer.analyze(
      "候補者の山田花子さんについて、最終面談後の評価を共有します。"
    );

    expect(mocks.pipeline).toHaveBeenCalledWith(
      "feature-extraction",
      WASM_CONTEXT_MODEL_ID,
      expect.objectContaining({
        device: "wasm",
        dtype: WASM_CONTEXT_MODEL_DTYPE,
        revision: WASM_CONTEXT_MODEL_REVISION
      })
    );
    expect(mocks.env.backends.onnx.wasm).toEqual(
      expect.objectContaining({
        wasmPaths: "chrome-extension://test/",
        proxy: false,
        numThreads: 1
      })
    );
    expect(result.error).toBeUndefined();
    expect(result.rawText).toBe("");
    expect(result.modelId).toBe(WASM_CONTEXT_MODEL_ID);
    expect(result.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "hr_info" }),
        expect.objectContaining({ category: "person_name", surface: "山田花子さん" })
      ])
    );

    await analyzer.dispose();
    expect(mocks.dispose).toHaveBeenCalledTimes(1);
  });
});
