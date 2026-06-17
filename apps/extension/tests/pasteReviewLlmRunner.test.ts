import { describe, expect, it, vi } from "vitest";
import type { ContextAnalysisResult } from "@ai-mae-check/llm";
import type { Finding } from "@ai-mae-check/core";
import { PASTE_REVIEW_LLM_DISABLED_MESSAGE } from "../src/lib/pasteReviewLlmState";
import { runPasteReviewLlm } from "../src/lib/pasteReviewLlmRunner";

class FakeButton {
  readonly attributes = new Map<string, string>();

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
}

function finding(): Finding {
  return {
    id: "finding-1",
    ruleId: "email",
    source: "rule",
    label: "メールアドレス",
    riskLevel: "high",
    start: 0,
    end: 16,
    text: "taro@example.com",
    placeholder: "[EMAIL_1]",
    message: "外部へ貼り付ける前に確認したい情報です。",
    confidence: 0.99
  };
}

describe("runPasteReviewLlm", () => {
  it("AI文脈チェックが無効なら実行せず無効メッセージを表示する", async () => {
    const analyze = vi.fn();
    const llmStatus = { textContent: "" };
    const llmButton = new FakeButton();

    await runPasteReviewLlm({
      enabled: false,
      inputText: "テスト",
      modelId: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
      existingFindings: [],
      llmStatus: llmStatus as HTMLElement,
      llmButton: llmButton as unknown as HTMLButtonElement,
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

    await runPasteReviewLlm({
      enabled: true,
      inputText: "候補者の山田花子さんについて確認します。",
      modelId: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
      existingFindings: [finding()],
      llmStatus: llmStatus as HTMLElement,
      llmButton: llmButton as unknown as HTMLButtonElement,
      selectedCandidateIds,
      setCandidates,
      render,
      analyze
    });

    expect(analyze).toHaveBeenCalledWith(
      "候補者の山田花子さんについて確認します。",
      expect.objectContaining({
        modelId: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
        existingFindings: [finding()],
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

    await runPasteReviewLlm({
      enabled: true,
      inputText: "テスト",
      modelId: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
      existingFindings: [],
      llmStatus: llmStatus as HTMLElement,
      llmButton: llmButton as unknown as HTMLButtonElement,
      selectedCandidateIds: new Set(),
      setCandidates: vi.fn(),
      render,
      analyze
    });

    expect(llmStatus.textContent).toContain("AI文脈チェックを実行できませんでした。");
    expect(llmStatus.textContent).toContain("診断メモ: ページを再読み込みしてから再試行してください。");
    expect(render).not.toHaveBeenCalled();
  });
});
