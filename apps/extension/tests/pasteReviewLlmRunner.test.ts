import { describe, expect, it, vi } from "vitest";
import type { ContextAnalysisResult } from "@ai-mae-check/llm";
import {
  PASTE_REVIEW_LLM_DISABLED_MESSAGE,
  PASTE_REVIEW_LLM_LOADING_MESSAGE
} from "../src/lib/pasteReviewLlmState";
import {
  LOCAL_CONTEXT_FALLBACK_MESSAGE,
  runReviewLlm,
  type RunReviewLlmOptions
} from "../src/lib/reviewLlmRunner";
import { asDomElement } from "./helpers/fakeDom";
import { buildFinding } from "./testBuilders";

class FakeButton {
  readonly attributes = new Map<string, string>();

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
}

type AnalyzeReviewContextForTest = NonNullable<RunReviewLlmOptions["analyze"]>;

describe("runReviewLlm", () => {
  it("画面を閉じた後に完了した結果で候補や表示を更新しない", async () => {
    let resolveAnalysis: ((result: ContextAnalysisResult) => void) | undefined;
    const analyze = vi.fn(
      () =>
        new Promise<ContextAnalysisResult>((resolve) => {
          resolveAnalysis = resolve;
        })
    );
    const llmStatus = { textContent: "" };
    const llmButton = new FakeButton();
    const setCandidates = vi.fn();
    const render = vi.fn();
    let active = true;

    const execution = runReviewLlm({
      enabled: true,
      inputText: "候補者の山田花子さんを確認します。",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "standard",
      existingFindings: [],
      llmStatus: asDomElement<HTMLElement>(llmStatus),
      llmButton: asDomElement<HTMLButtonElement>(llmButton),
      selectedCandidateIds: new Set(),
      setCandidates,
      render,
      isActive: () => active,
      analyze
    });

    active = false;
    resolveAnalysis?.({
      candidates: [],
      summary: "追加候補はありません。",
      rawText: "{}",
      modelId: "test-model",
      elapsedMs: 10
    });
    await execution;

    expect(setCandidates).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
    expect(llmStatus.textContent).toBe(PASTE_REVIEW_LLM_LOADING_MESSAGE);
  });

  it("AI文脈チェックが無効なら実行せず無効メッセージを表示する", async () => {
    const analyze = vi.fn();
    const llmStatus = { textContent: "" };
    const llmButton = new FakeButton();

    await runReviewLlm({
      enabled: false,
      inputText: "テスト",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "standard",
      existingFindings: [],
      llmStatus: asDomElement<HTMLElement>(llmStatus),
      llmButton: asDomElement<HTMLButtonElement>(llmButton),
      selectedCandidateIds: new Set(),
      setCandidates: vi.fn(),
      render: vi.fn(),
      analyze
    });

    expect(analyze).not.toHaveBeenCalled();
    expect(llmStatus.textContent).toBe(PASTE_REVIEW_LLM_DISABLED_MESSAGE);
    expect(llmButton.attributes.has("disabled")).toBe(false);
  });

  it("成功時は進捗表示、候補反映、confidenceによる初期選択、再描画を行う", async () => {
    const result: ContextAnalysisResult = {
      candidates: [
        {
          id: "candidate-high",
          category: "person_name",
          surface: "山田花子さん",
          label: "人名候補",
          reason: "採用文脈の候補です。",
          riskLevel: "medium",
          suggestedPlaceholder: "[PERSON_1]",
          confidence: 0.86
        },
        {
          id: "candidate-low",
          category: "project_name",
          surface: "Project Alpha",
          label: "案件名候補",
          reason: "案件名の候補です。",
          riskLevel: "low",
          suggestedPlaceholder: "[PROJECT_1]",
          confidence: 0.62
        }
      ],
      summary: "注意候補があります。",
      rawText: "{}",
      modelId: "test-model",
      elapsedMs: 12
    };
    const analyze = vi.fn(async (_input: string, options: { onProgress?: (progress: { message: string }) => void }) => {
      options.onProgress?.({ message: "文脈リスクを確認しています。" });
      return result;
    });
    const llmStatus = { textContent: "" };
    const llmButton = new FakeButton();
    const selectedCandidateIds = new Set<string>();
    const setCandidates = vi.fn();
    const render = vi.fn();

    await runReviewLlm({
      enabled: true,
      inputText: "候補者の山田花子さんについて確認します。",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "standard",
      existingFindings: [buildFinding()],
      llmStatus: asDomElement<HTMLElement>(llmStatus),
      llmButton: asDomElement<HTMLButtonElement>(llmButton),
      selectedCandidateIds,
      setCandidates,
      render,
      analyze
    });

    expect(analyze).toHaveBeenCalledWith(
      "候補者の山田花子さんについて確認します。",
      expect.objectContaining({
        modelId: "gemma3-1b-it-q4f16_1-MLC",
        profileId: "standard",
        existingFindings: [buildFinding()],
        onProgress: expect.any(Function)
      })
    );
    expect(setCandidates).toHaveBeenCalledWith(result.candidates);
    expect(Array.from(selectedCandidateIds)).toEqual(["candidate-high"]);
    expect(llmStatus.textContent).toBe("AI文脈チェックで注意候補が見つかりました。");
    expect(llmButton.attributes.has("disabled")).toBe(false);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("実行不能エラー結果は診断メモつきのステータスとして表示する", async () => {
    const analyze = vi.fn(async (): Promise<ContextAnalysisResult> => ({
      candidates: [],
      summary: "AI文脈チェックを実行できませんでした。",
      rawText: "",
      modelId: "test-model",
      elapsedMs: 10,
      error: "AI文脈チェックを実行できませんでした。",
      errorDetail: {
        kind: "worker",
        message: "AI文脈チェックを実行できませんでした。",
        hint: "ページを再読み込みしてから再試行してください。",
        technicalDetail: "Worker disposed"
      }
    }));
    const llmStatus = { textContent: "" };
    const llmButton = new FakeButton();
    const render = vi.fn();

    await runReviewLlm({
      enabled: true,
      inputText: "テスト",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "standard",
      existingFindings: [],
      llmStatus: asDomElement<HTMLElement>(llmStatus),
      llmButton: asDomElement<HTMLButtonElement>(llmButton),
      selectedCandidateIds: new Set(),
      setCandidates: vi.fn(),
      render,
      analyze
    });

    expect(llmStatus.textContent).toContain("AI文脈チェックを実行できませんでした。");
    expect(llmStatus.textContent).toContain("診断メモ: ページを再読み込みしてから再試行してください。");
    expect(render).not.toHaveBeenCalled();
  });

  it("GPUメモリ不足時は同じGemmaモデルを低負荷プロファイルで一度だけ再試行する", async () => {
    const analyze = vi.fn<AnalyzeReviewContextForTest>().mockResolvedValueOnce({
      candidates: [
        {
          id: "local-context-hr_info-1",
          category: "hr_info",
          surface: "給与条件",
          label: "採用・人事情報候補",
          reason: "採用や人事評価に関する文脈です。",
          riskLevel: "medium",
          suggestedPlaceholder: "[HR_INFO_1]",
          confidence: 0.8
        }
      ],
      summary: "GPU実行に失敗しました。",
      rawText: "",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      elapsedMs: 10,
      error: "ローカルAIモデルの実行に必要なメモリを確保できませんでした。",
      errorDetail: {
        kind: "memory",
        message: "ローカルAIモデルの実行に必要なメモリを確保できませんでした。",
        hint: "低負荷へ切り替え、ページを再読み込みしてから再試行してください。",
        technicalDetail: "Device was lost due to insufficient memory"
      }
    }).mockResolvedValueOnce({
      candidates: [
        {
          id: "llm-context-hr_info-1",
          category: "hr_info",
          surface: "給与条件",
          label: "採用・人事情報候補",
          reason: "採用や人事評価に関する文脈です。",
          riskLevel: "medium",
          suggestedPlaceholder: "[HR_INFO_1]",
          confidence: 0.82
        }
      ],
      summary: "低負荷で確認しました。",
      rawText: "{}",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      elapsedMs: 20
    });
    const llmStatus = { textContent: "" };
    const llmButton = new FakeButton();
    const setCandidates = vi.fn();
    const render = vi.fn();

    await runReviewLlm({
      enabled: true,
      inputText: "候補者の給与条件を確認します。",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "standard",
      existingFindings: [],
      llmStatus: asDomElement<HTMLElement>(llmStatus),
      llmButton: asDomElement<HTMLButtonElement>(llmButton),
      selectedCandidateIds: new Set(),
      setCandidates,
      render,
      analyze
    });

    expect(analyze).toHaveBeenCalledTimes(2);
    expect(analyze.mock.calls[0]?.[1].modelId).toBe("gemma3-1b-it-q4f16_1-MLC");
    expect(analyze.mock.calls[0]?.[1].profileId).toBe("standard");
    expect(analyze.mock.calls[1]?.[1].profileId).toBe("low_resource");
    expect(setCandidates).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ surface: "給与条件" })])
    );
    expect(llmStatus.textContent).toBe("AI文脈チェックで注意候補が見つかりました。");
  });

  it("低負荷での再試行も失敗した場合は二度で終了して補助候補を維持する", async () => {
    const failedResult: ContextAnalysisResult = {
      candidates: [
        {
          id: "local-context-project_name-1",
          category: "project_name",
          surface: "Project Blue Bridge",
          label: "案件名・プロジェクト名候補",
          reason: "案件名らしい表現です。",
          riskLevel: "medium",
          suggestedPlaceholder: "[PROJECT_1]",
          confidence: 0.82
        }
      ],
      summary: "GPU実行が中断されました。",
      rawText: "",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      elapsedMs: 10,
      error: "GPU実行が中断されました。",
      errorDetail: {
        kind: "webgpu",
        message: "GPU実行が中断されました。",
        hint: "低負荷で再試行してください。",
        technicalDetail: "Object has already been disposed"
      }
    };
    const analyze = vi.fn<AnalyzeReviewContextForTest>().mockResolvedValue(failedResult);
    const llmStatus = { textContent: "" };
    const setCandidates = vi.fn();

    await runReviewLlm({
      enabled: true,
      inputText: "Project Blue Bridge の提案です。",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "standard",
      existingFindings: [],
      llmStatus: asDomElement<HTMLElement>(llmStatus),
      llmButton: asDomElement<HTMLButtonElement>(new FakeButton()),
      selectedCandidateIds: new Set(),
      setCandidates,
      render: vi.fn(),
      analyze
    });

    expect(analyze).toHaveBeenCalledTimes(2);
    expect(analyze.mock.calls[1]?.[1].profileId).toBe("low_resource");
    expect(setCandidates).toHaveBeenCalledWith(failedResult.candidates);
    expect(llmStatus.textContent).toContain(LOCAL_CONTEXT_FALLBACK_MESSAGE);
  });

  it("低負荷設定でもGemmaを低負荷プロファイルで1回だけ実行する", async () => {
    const analyze = vi.fn<AnalyzeReviewContextForTest>(async () => ({
      candidates: [],
      summary: "追加候補はありません。",
      rawText: "{}",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      elapsedMs: 10
    }));

    await runReviewLlm({
      enabled: true,
      inputText: "一般的な確認文です。",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "low_resource",
      existingFindings: [],
      llmStatus: asDomElement<HTMLElement>({ textContent: "" }),
      llmButton: asDomElement<HTMLButtonElement>(new FakeButton()),
      selectedCandidateIds: new Set(),
      setCandidates: vi.fn(),
      render: vi.fn(),
      analyze
    });

    expect(analyze).toHaveBeenCalledTimes(1);
    expect(analyze.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        modelId: "gemma3-1b-it-q4f16_1-MLC",
        profileId: "low_resource"
      })
    );
  });

  it("WebGPUアダプタ未取得では同じページ内で再試行しない", async () => {
    const analyze = vi.fn<AnalyzeReviewContextForTest>(async () => ({
      candidates: [],
      summary: "WebGPUアダプタを取得できませんでした。",
      rawText: "",
      modelId: "test-model",
      elapsedMs: 10,
      error: "WebGPUアダプタを取得できませんでした。",
      errorDetail: {
        kind: "webgpu",
        message: "WebGPUアダプタを取得できませんでした。",
        hint: "chrome://gpuを確認してください。",
        technicalDetail: "No available WebGPU adapters"
      }
    }));
    const llmStatus = { textContent: "" };

    await runReviewLlm({
      enabled: true,
      inputText: "一般的な確認文です。",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "standard",
      existingFindings: [],
      llmStatus: asDomElement<HTMLElement>(llmStatus),
      llmButton: asDomElement<HTMLButtonElement>(new FakeButton()),
      selectedCandidateIds: new Set(),
      setCandidates: vi.fn(),
      render: vi.fn(),
      analyze
    });

    expect(analyze).toHaveBeenCalledTimes(1);
    expect(llmStatus.textContent).toContain("WebGPUアダプタを取得できませんでした。");
  });

  it("実行開始時に前回の空候補メッセージを隠して再描画する", async () => {
    const analyze = vi.fn(async (): Promise<ContextAnalysisResult> => ({
      candidates: [],
      summary: "追加候補はありません。",
      rawText: "",
      modelId: "test-model",
      elapsedMs: 10
    }));
    const llmStatus = { textContent: "" };
    const llmButton = new FakeButton();
    const setEmptyCandidateMessageVisible = vi.fn();
    const render = vi.fn();

    await runReviewLlm({
      enabled: true,
      inputText: "テスト",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "standard",
      existingFindings: [],
      llmStatus: asDomElement<HTMLElement>(llmStatus),
      llmButton: asDomElement<HTMLButtonElement>(llmButton),
      selectedCandidateIds: new Set(),
      setCandidates: vi.fn(),
      setEmptyCandidateMessageVisible,
      render,
      analyze
    });

    expect(setEmptyCandidateMessageVisible.mock.calls[0]).toEqual([false]);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it("JSON読み取り失敗の非致命結果は診断メモではなく続行メッセージとして表示する", async () => {
    const result: ContextAnalysisResult = {
      candidates: [
        {
          id: "local-context-person_name-1",
          category: "person_name",
          surface: "山田花子さん",
          label: "人名候補",
          reason: "採用や評価文脈に含まれる個人名候補です。",
          riskLevel: "medium",
          suggestedPlaceholder: "[PERSON_1]",
          confidence: 0.82
        }
      ],
      summary: "ブラウザ内の補助検出で注意候補を確認しました。安全化対象を選んで続行できます。",
      rawText: "",
      modelId: "test-model",
      elapsedMs: 10,
      errorDetail: {
        kind: "json_parse",
        message: "AI文脈チェックの結果を読み取れませんでした。",
        hint: "ルールベース検出結果は維持されています。必要なら再実行してください。",
        technicalDetail: "AI文脈チェックの結果を読み取れませんでした"
      }
    };
    const analyze = vi.fn(async () => result);
    const llmStatus = { textContent: "" };
    const llmButton = new FakeButton();
    const selectedCandidateIds = new Set<string>();
    const setCandidates = vi.fn();
    const render = vi.fn();

    await runReviewLlm({
      enabled: true,
      inputText: "候補者の山田花子さんについて確認します。",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "standard",
      existingFindings: [],
      llmStatus: asDomElement<HTMLElement>(llmStatus),
      llmButton: asDomElement<HTMLButtonElement>(llmButton),
      selectedCandidateIds,
      setCandidates,
      render,
      analyze
    });

    expect(setCandidates).toHaveBeenCalledWith(result.candidates);
    expect(Array.from(selectedCandidateIds)).toEqual(["local-context-person_name-1"]);
    expect(llmStatus.textContent).toBe(
      "ブラウザ内の補助検出で注意候補を確認しました。安全化対象を選んで続行できます。"
    );
    expect(llmStatus.textContent).not.toContain("診断メモ");
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("JSON読み取り失敗でrejectされても補助候補を表示して続行できる状態にする", async () => {
    const analyze = vi.fn(async () => {
      throw new Error("AI文脈チェックの結果を読み取れませんでした");
    });
    const llmStatus = { textContent: "" };
    const llmButton = new FakeButton();
    const selectedCandidateIds = new Set<string>();
    const setCandidates = vi.fn();
    const render = vi.fn();

    await runReviewLlm({
      enabled: true,
      inputText: "佐藤様向けに Project Blue Bridge の提案メモを作ります。",
      modelId: "gemma3-1b-it-q4f16_1-MLC",
      profileId: "standard",
      existingFindings: [],
      llmStatus: asDomElement<HTMLElement>(llmStatus),
      llmButton: asDomElement<HTMLButtonElement>(llmButton),
      selectedCandidateIds,
      setCandidates,
      render,
      analyze
    });

    const candidates = setCandidates.mock.calls[0]?.[0] as ContextAnalysisResult["candidates"];
    expect(candidates.map((candidate) => candidate.surface)).toEqual(["Project Blue Bridge", "佐藤様"]);
    expect(Array.from(selectedCandidateIds)).toEqual(["local-context-project_name-1", "local-context-person_name-1"]);
    expect(llmStatus.textContent).toBe("ブラウザ内の補助検出で注意候補を確認しました。安全化対象を選んで続行できます。");
    expect(render).toHaveBeenCalledTimes(1);
    expect(llmButton.attributes.has("disabled")).toBe(false);
  });
});
