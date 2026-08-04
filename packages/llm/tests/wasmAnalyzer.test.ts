import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOCAL_CONTEXT_MODEL_DTYPE,
  LOCAL_CONTEXT_MODEL_ID,
  LOCAL_CONTEXT_MODEL_REVISION,
  LOCAL_NER_MODEL_DTYPE,
  LOCAL_NER_MODEL_ID,
  LOCAL_NER_MODEL_REVISION
} from "../src";
import { createWasmContextAnalyzer } from "../src/wasmAnalyzer";

const mocks = vi.hoisted(() => {
  const disposeFeature = vi.fn(async () => undefined);
  const disposeNer = vi.fn(async () => undefined);
  const featureExtractor = Object.assign(
    vi.fn(async (texts: string[]) => ({
      tolist: () =>
        texts.length === 6
          ? Array.from({ length: 6 }, (_, index) =>
              Array.from({ length: 6 }, (_, current) => (index === current ? 1 : 0))
            )
          : texts.map(() => [0, 1, 0, 0, 0, 0])
    })),
    { dispose: disposeFeature }
  );
  const nerExtractor = Object.assign(
    vi.fn(async (input: string) => {
      const surface = "山田花子さん";
      const start = input.indexOf(surface);
      return start >= 0
        ? [{ entity: "PER", score: 0.94, index: 1, word: surface, start, end: start + surface.length }]
        : [];
    }),
    { dispose: disposeNer }
  );
  return {
    failFeatureLoad: false,
    failNerLoad: false,
    disposeFeature,
    disposeNer,
    featureExtractor,
    nerExtractor,
    pipeline: vi.fn(async (task: string) => {
      if (task === "feature-extraction") {
        if (mocks.failFeatureLoad) throw new Error("context model fetch failed");
        return featureExtractor;
      }
      if (mocks.failNerLoad) throw new Error("ner model fetch failed");
      return nerExtractor;
    }),
    env: {
      allowLocalModels: true,
      allowRemoteModels: false,
      useBrowserCache: false,
      backends: { onnx: { wasm: {} } }
    }
  };
});

vi.mock("@huggingface/transformers", () => ({ env: mocks.env, pipeline: mocks.pipeline }));

describe("createWasmContextAnalyzer", () => {
  beforeEach(() => {
    mocks.failFeatureLoad = false;
    mocks.failNerLoad = false;
    mocks.pipeline.mockClear();
    mocks.featureExtractor.mockClear();
    mocks.nerExtractor.mockClear();
    mocks.disposeFeature.mockClear();
    mocks.disposeNer.mockClear();
  });

  it("Ruriの準備だけ失敗してもNER候補を返す", async () => {
    mocks.failFeatureLoad = true;
    const analyzer = createWasmContextAnalyzer({ wasmRootUrl: "chrome-extension://test/" });

    const result = await analyzer.analyze("担当は山田花子さんです。");

    expect(result.error).toBeUndefined();
    expect(result.warnings).toHaveLength(1);
    expect(result.candidates).toEqual(
      expect.arrayContaining([expect.objectContaining({ category: "person_name", surface: "山田花子さん" })])
    );
    await analyzer.dispose();
  });

  it("NERの準備だけ失敗してもRuriの文脈候補を返す", async () => {
    mocks.failNerLoad = true;
    const analyzer = createWasmContextAnalyzer({ wasmRootUrl: "chrome-extension://test/" });

    const result = await analyzer.analyze("候補者の最終面談後の評価を共有します。");

    expect(result.error).toBeUndefined();
    expect(result.warnings).toHaveLength(1);
    expect(result.candidates).toEqual(
      expect.arrayContaining([expect.objectContaining({ category: "hr_info" })])
    );
    await analyzer.dispose();
  });

  it("両方のモデルを準備できなくてもルール外の決定的な補助候補を残す", async () => {
    mocks.failFeatureLoad = true;
    mocks.failNerLoad = true;
    const analyzer = createWasmContextAnalyzer({ wasmRootUrl: "chrome-extension://test/" });

    const result = await analyzer.analyze("担当は山田花子さんです。");

    expect(result.error).toBeDefined();
    expect(result.rawText).toBe("");
    expect(result.candidates).toEqual(
      expect.arrayContaining([expect.objectContaining({ category: "person_name", surface: "山田花子さん" })])
    );
    await analyzer.dispose();
  });

  it("固定revisionのRuriとNERモデルをWASMで読み込み、本文を保存せず候補を返す", async () => {
    const analyzer = createWasmContextAnalyzer({ wasmRootUrl: "chrome-extension://test/" });
    const result = await analyzer.analyze(
      "候補者の山田花子さんについて、最終面談後の評価を共有します。"
    );

    expect(mocks.pipeline).toHaveBeenCalledWith(
      "feature-extraction",
      LOCAL_CONTEXT_MODEL_ID,
      expect.objectContaining({
        device: "wasm",
        dtype: LOCAL_CONTEXT_MODEL_DTYPE,
        revision: LOCAL_CONTEXT_MODEL_REVISION
      })
    );
    expect(mocks.pipeline).toHaveBeenCalledWith(
      "token-classification",
      LOCAL_NER_MODEL_ID,
      expect.objectContaining({
        device: "wasm",
        dtype: LOCAL_NER_MODEL_DTYPE,
        revision: LOCAL_NER_MODEL_REVISION
      })
    );
    expect(mocks.env.backends.onnx.wasm).toEqual(
      expect.objectContaining({ wasmPaths: "chrome-extension://test/", proxy: false, numThreads: 1 })
    );
    expect(result.error).toBeUndefined();
    expect(result.rawText).toBe("");
    expect(result.modelIds).toEqual([LOCAL_CONTEXT_MODEL_ID, LOCAL_NER_MODEL_ID]);
    expect(result.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "hr_info" }),
        expect.objectContaining({ category: "person_name", surface: "山田花子さん" })
      ])
    );

    await analyzer.dispose();
    expect(mocks.disposeFeature).toHaveBeenCalledTimes(1);
    expect(mocks.disposeNer).toHaveBeenCalledTimes(1);
  });
});
