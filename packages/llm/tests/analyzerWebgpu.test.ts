import { afterEach, describe, expect, it, vi } from "vitest";
import { createLlmContextAnalyzer, DEFAULT_MODEL_ID } from "../src";

let completionText = JSON.stringify({
  candidates: [],
  summary: "追加候補はありません。"
});

const completionCreateMock = vi.fn(async () => ({
  choices: [
    {
      message: {
        content: completionText
      }
    }
  ]
}));

const createEngineMock = vi.fn(async () => ({
  chat: {
    completions: {
      create: completionCreateMock
    }
  }
}));

vi.mock("@mlc-ai/web-llm", () => ({
  CreateWebWorkerMLCEngine: createEngineMock,
  prebuiltAppConfig: {
    model_list: [{ model_id: DEFAULT_MODEL_ID }]
  }
}));

class TestWorker {
  constructor(
    public readonly url: string,
    public readonly options?: WorkerOptions
  ) {}

  terminate() {}
}

describe("WebGPU事前チェック", () => {
  afterEach(() => {
    completionText = JSON.stringify({
      candidates: [],
      summary: "追加候補はありません。"
    });
    completionCreateMock.mockClear();
    createEngineMock.mockClear();
    vi.unstubAllGlobals();
  });

  it("requestAdapterがnullでもWorker側のWebLLM初期化を試す", async () => {
    const requestAdapter = vi.fn(async () => null);
    vi.stubGlobal("navigator", { gpu: { requestAdapter } });
    vi.stubGlobal("Worker", TestWorker);

    const analyzer = createLlmContextAnalyzer({ workerUrl: "/llm-worker.js" });
    const result = await analyzer.analyze("A社向けの提案です。");

    expect(requestAdapter).toHaveBeenCalled();
    expect(result.errorDetail).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(createEngineMock).toHaveBeenCalledWith(expect.any(TestWorker), DEFAULT_MODEL_ID, expect.any(Object));
    expect(result.summary).toBe("追加候補はありません。");
  });

  it("WebLLMのJSONを読み取れない場合でもローカル補助候補があれば結果として返す", async () => {
    completionText = "候補としては山田花子さんに注意してください。";
    vi.stubGlobal("navigator", { gpu: { requestAdapter: vi.fn(async () => ({})) } });
    vi.stubGlobal("Worker", TestWorker);

    const analyzer = createLlmContextAnalyzer({ workerUrl: "/llm-worker.js" });
    const result = await analyzer.analyze("候補者の山田花子さんについて、最終面談後の評価メモも含めます。");

    expect(result.error).toBeUndefined();
    expect(result.errorDetail?.kind).toBe("json_parse");
    expect(result.summary).toBe("ブラウザ内の補助検出で注意候補を確認しました。安全化対象を選んで続行できます。");
    expect(result.candidates.map((candidate) => candidate.surface)).toContain("山田花子さん");
  });

  it("WebLLMのJSONを読み取れずローカル補助候補もない場合は非致命的な結果として返す", async () => {
    completionText = "この文章では、追加でマスクすべき候補は特に見当たりません。";
    vi.stubGlobal("navigator", { gpu: { requestAdapter: vi.fn(async () => ({})) } });
    vi.stubGlobal("Worker", TestWorker);

    const analyzer = createLlmContextAnalyzer({ workerUrl: "/llm-worker.js" });
    const result = await analyzer.analyze("来週の定例会議の議事録を整理します。");

    expect(result.error).toBeUndefined();
    expect(result.errorDetail?.kind).toBe("json_parse");
    expect(result.candidates).toEqual([]);
    expect(result.summary).toBe("ルールベース検出結果で安全化できます。AI文脈チェックは必要に応じて再実行してください。");
  });

  it("WebLLM実行自体が失敗してもローカル補助検出候補は返す", async () => {
    createEngineMock.mockImplementationOnce(async () => {
      throw new Error(
        'Failed to construct "Worker": script could not be loaded. prompt: 候補者の山田花子さんへ Project Blue Bridge の評価メモを送ります。'
      );
    });
    vi.stubGlobal("navigator", { gpu: { requestAdapter: vi.fn(async () => ({})) } });
    vi.stubGlobal("Worker", TestWorker);

    const analyzer = createLlmContextAnalyzer({ workerUrl: "/llm-worker.js" });
    const result = await analyzer.analyze("候補者の山田花子さんへ Project Blue Bridge の評価メモを送ります。");

    expect(result.errorDetail?.kind).toBe("worker");
    expect(result.candidates.map((candidate) => candidate.surface)).toEqual(["Project Blue Bridge", "山田花子さん"]);
    expect(result.errorDetail?.technicalDetail).not.toContain("山田花子");
  });
});
