import { describe, expect, it, vi } from "vitest";
import type { ContextAnalysisResult } from "@ai-mae-check/llm";
import {
  PASTE_REVIEW_LLM_DISABLED_MESSAGE,
  PASTE_REVIEW_LLM_LOADING_MESSAGE
} from "../src/lib/pasteReviewLlmState";
import { LOCAL_CONTEXT_FALLBACK_MESSAGE, runReviewLlm } from "../src/lib/reviewLlmRunner";
import { asDomElement } from "./helpers/fakeDom";

function candidate() {
  return {
    id: "candidate-1",
    category: "person_name" as const,
    surface: "山田花子さん",
    label: "人名候補",
    reason: "人名として抽出された候補です。",
    riskLevel: "medium" as const,
    suggestedPlaceholder: "[PERSON_1]",
    confidence: 0.9
  };
}

function result(overrides: Partial<ContextAnalysisResult> = {}): ContextAnalysisResult {
  return {
    candidates: [candidate()],
    summary: "注意候補があります。",
    rawText: "",
    modelId: "test-model",
    elapsedMs: 10,
    ...overrides
  };
}

function elements() {
  return {
    llmStatus: asDomElement<HTMLElement>({ textContent: "" }),
    llmButton: asDomElement<HTMLButtonElement>({ disabled: false })
  };
}

describe("runReviewLlm", () => {
  it("AI文脈チェックが無効なら解析しない", async () => {
    const analyze = vi.fn();
    const { llmStatus, llmButton } = elements();

    await runReviewLlm({
      enabled: false,
      inputText: "テスト",
      existingFindings: [],
      llmStatus,
      llmButton,
      selectedCandidateIds: new Set(),
      setCandidates: vi.fn(),
      render: vi.fn(),
      analyze
    });

    expect(analyze).not.toHaveBeenCalled();
    expect(llmStatus.textContent).toBe(PASTE_REVIEW_LLM_DISABLED_MESSAGE);
  });

  it("成功時は進捗、候補、初期選択を反映する", async () => {
    const analyze = vi.fn(async (_input: string, options: { onProgress: (progress: { phase: "analyzing"; message: string }) => void }) => {
      options.onProgress({ phase: "analyzing", message: "文脈リスクを確認しています。" });
      return result();
    });
    const { llmStatus, llmButton } = elements();
    const selectedCandidateIds = new Set<string>();
    const setCandidates = vi.fn();
    const render = vi.fn();

    await runReviewLlm({
      enabled: true,
      inputText: "山田花子さんについて確認します。",
      existingFindings: [],
      llmStatus,
      llmButton,
      selectedCandidateIds,
      setCandidates,
      render,
      analyze
    });

    expect(analyze).toHaveBeenCalledWith(
      "山田花子さんについて確認します。",
      expect.objectContaining({ maxCandidates: 12, onProgress: expect.any(Function) })
    );
    expect(setCandidates).toHaveBeenCalledWith([candidate()]);
    expect([...selectedCandidateIds]).toEqual(["candidate-1"]);
    expect(llmStatus.textContent).toContain("注意候補が見つかりました");
    expect(llmButton.disabled).toBe(false);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it("一方のモデルだけ失敗した場合は候補を維持して注意を表示する", async () => {
    const { llmStatus, llmButton } = elements();
    await runReviewLlm({
      enabled: true,
      inputText: "山田花子さん",
      existingFindings: [],
      llmStatus,
      llmButton,
      selectedCandidateIds: new Set(),
      setCandidates: vi.fn(),
      render: vi.fn(),
      analyze: vi.fn(async () => result({
        warnings: [{ kind: "wasm", message: "文脈分類を実行できませんでした。", hint: "接続を確認してください。" }]
      }))
    });

    expect(llmStatus.textContent).toContain("一部のブラウザ内モデルは利用できませんでした");
  });

  it("両モデルの実行不能結果でも補助候補と診断を維持する", async () => {
    const { llmStatus, llmButton } = elements();
    const setCandidates = vi.fn();
    await runReviewLlm({
      enabled: true,
      inputText: "山田花子さん",
      existingFindings: [],
      llmStatus,
      llmButton,
      selectedCandidateIds: new Set(),
      setCandidates,
      render: vi.fn(),
      analyze: vi.fn(async () => result({
        error: "AI文脈チェックを実行できませんでした。",
        errorDetail: { kind: "wasm", message: "AI文脈チェックを実行できませんでした。", hint: "保存領域を確認してください。" }
      }))
    });

    expect(setCandidates).toHaveBeenCalledWith([candidate()]);
    expect(llmStatus.textContent).toContain(LOCAL_CONTEXT_FALLBACK_MESSAGE);
    expect(llmStatus.textContent).toContain("診断メモ");
  });

  it("画面を閉じた後に完了した結果を反映しない", async () => {
    let resolveAnalysis: ((value: ContextAnalysisResult) => void) | undefined;
    const analyze = vi.fn(() => new Promise<ContextAnalysisResult>((resolve) => { resolveAnalysis = resolve; }));
    const { llmStatus, llmButton } = elements();
    const setCandidates = vi.fn();
    const render = vi.fn();
    let active = true;

    const execution = runReviewLlm({
      enabled: true,
      inputText: "山田花子さん",
      existingFindings: [],
      llmStatus,
      llmButton,
      selectedCandidateIds: new Set(),
      setCandidates,
      render,
      isActive: () => active,
      analyze
    });
    active = false;
    resolveAnalysis?.(result());
    await execution;

    expect(setCandidates).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledTimes(1);
    expect(llmStatus.textContent).toBe(PASTE_REVIEW_LLM_LOADING_MESSAGE);
  });
});
