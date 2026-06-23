import { describe, expect, it, vi } from "vitest";
import { classifyLlmError, createLocalLlmRuntimeService } from "../src";
import type {
  AnalyzeContextOptions,
  ContextAnalysisResult,
  LlmContextAnalyzer,
  LlmProgress
} from "../src";

function createResult(overrides: Partial<ContextAnalysisResult> = {}): ContextAnalysisResult {
  return {
    candidates: [],
    summary: "追加候補はありません。",
    rawText: "",
    modelId: "test-model",
    elapsedMs: 1,
    ...overrides
  };
}

function createAnalyzer(
  overrides: Partial<LlmContextAnalyzer> & {
    ready?: boolean;
    onAnalyze?: (input: string, options?: AnalyzeContextOptions) => Promise<ContextAnalysisResult>;
  } = {}
): LlmContextAnalyzer {
  let ready = overrides.ready ?? false;
  const overridePrepare = overrides.prepare;
  const overrideAnalyze = overrides.analyze;
  const overrideIsReady = overrides.isReady;
  const overrideDispose = overrides.dispose;

  return {
    async prepare(onProgress?: (progress: LlmProgress) => void): Promise<void> {
      if (overridePrepare) {
        return overridePrepare(onProgress);
      }
      onProgress?.({
        phase: "loading",
        message: "ローカルAIモデルを準備しています。"
      });
      ready = true;
    },
    async analyze(input, options): Promise<ContextAnalysisResult> {
      ready = true;
      if (overrideAnalyze) {
        return overrideAnalyze(input, options);
      }
      return overrides.onAnalyze?.(input, options) ?? createResult();
    },
    isReady(): boolean {
      return overrideIsReady?.() ?? ready;
    },
    async dispose(): Promise<void> {
      if (overrideDispose) {
        await overrideDispose();
        return;
      }
      ready = false;
    }
  };
}

describe("LocalLlmRuntimeService", () => {
  it("prepareで未準備からreadyへ状態遷移する", async () => {
    const analyzer = createAnalyzer();
    const service = createLocalLlmRuntimeService({ modelId: "test-model", analyzer });

    expect(service.status()).toMatchObject({
      phase: "idle",
      ready: false,
      modelId: "test-model"
    });

    await service.prepare();

    expect(service.status()).toMatchObject({
      phase: "ready",
      ready: true,
      modelId: "test-model",
      message: "AI文脈チェックを実行できます。"
    });
  });

  it("analyzeの進捗を内部状態と呼び出し元のonProgressへ反映する", async () => {
    const onProgress = vi.fn();
    const analyzer = createAnalyzer({
      async analyze(_input, options): Promise<ContextAnalysisResult> {
        options?.onProgress?.({
          phase: "analyzing",
          message: "文脈リスクを確認しています。"
        });
        return createResult();
      }
    });
    const service = createLocalLlmRuntimeService({ modelId: "test-model", analyzer });

    const result = await service.analyze({
      input: "A社向け提案メモです。",
      onProgress
    });

    expect(result.error).toBeUndefined();
    expect(onProgress).toHaveBeenCalledWith({
      phase: "analyzing",
      message: "文脈リスクを確認しています。"
    });
    expect(service.status()).toMatchObject({
      phase: "ready",
      ready: true
    });
  });

  it("実行エラー結果をerror状態として保持し、本文をstatusへ含めない", async () => {
    const analyzer = createAnalyzer({
      async analyze(): Promise<ContextAnalysisResult> {
        return createResult({
          summary: "AI文脈チェックを実行できませんでした。",
          error: "AI文脈チェックを実行できませんでした。",
          errorDetail: {
            kind: "worker",
            message: "AI文脈チェック用のWorkerを起動できませんでした。",
            hint: "ページを再読み込みしてから再試行してください。",
            technicalDetail: "Worker failed: [redacted]"
          }
        });
      }
    });
    const service = createLocalLlmRuntimeService({ modelId: "test-model", analyzer });

    await service.analyze({
      input: "秘密本文 taro@example.com"
    });

    const serializedStatus = JSON.stringify(service.status());
    expect(service.status()).toMatchObject({
      phase: "error",
      ready: false,
      message: "AI文脈チェック用のWorkerを起動できませんでした。"
    });
    expect(serializedStatus).not.toContain("秘密本文");
    expect(serializedStatus).not.toContain("taro@example.com");
  });

  it("throwされたエラーも本文なしのerror状態にする", async () => {
    const analyzer = createAnalyzer({
      async analyze(): Promise<ContextAnalysisResult> {
        throw new Error("Worker failed. input: 秘密本文 taro@example.com");
      }
    });
    const service = createLocalLlmRuntimeService({ modelId: "test-model", analyzer });

    let caughtError: unknown = null;
    try {
      await service.analyze({
        input: "秘密本文 taro@example.com"
      });
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeTruthy();
    const serializedCaughtErrorDetail = JSON.stringify(classifyLlmError(caughtError));
    const serializedStatus = JSON.stringify(service.status());
    expect(service.status().phase).toBe("error");
    expect(serializedCaughtErrorDetail).not.toContain("秘密本文");
    expect(serializedCaughtErrorDetail).not.toContain("taro@example.com");
    expect(serializedStatus).not.toContain("秘密本文");
    expect(serializedStatus).not.toContain("taro@example.com");
    expect(serializedStatus).not.toContain("Project Blue Bridge");
  });

  it("実行エラー結果のerrorDetailも本文断片を含めず返す", async () => {
    const analyzer = createAnalyzer({
      async analyze(): Promise<ContextAnalysisResult> {
        return createResult({
          summary: "AI文脈チェックを実行できませんでした。",
          error: "AI文脈チェックを実行できませんでした。",
          errorDetail: {
            kind: "worker",
            message: "AI文脈チェック用のWorkerを起動できませんでした。",
            hint: "ページを再読み込みしてから再試行してください。",
            technicalDetail: "Worker failed near taro@example.com and Project Blue Bridge"
          }
        });
      }
    });
    const service = createLocalLlmRuntimeService({ modelId: "test-model", analyzer });

    const result = await service.analyze({
      input: "連絡先は taro@example.com です。Project Blue Bridge の提案メモも含みます。"
    });
    const serializedResult = JSON.stringify(result);
    const serializedStatus = JSON.stringify(service.status());

    expect(serializedResult).not.toContain("taro@example.com");
    expect(serializedResult).not.toContain("Project");
    expect(serializedResult).not.toContain("Blue");
    expect(serializedResult).not.toContain("Bridge");
    expect(serializedStatus).not.toContain("taro@example.com");
    expect(serializedStatus).not.toContain("Project");
    expect(serializedStatus).not.toContain("Blue");
    expect(serializedStatus).not.toContain("Bridge");
  });

  it("errorDetailのmessageとhintに本文断片が混ざっても安全化する", async () => {
    const analyzer = createAnalyzer({
      async analyze(): Promise<ContextAnalysisResult> {
        return createResult({
          summary: "AI文脈チェックを実行できませんでした。",
          error: "AI文脈チェックを実行できませんでした。",
          errorDetail: {
            kind: "worker",
            message: "Worker failed for taro@example.com and Project Blue Bridge",
            hint: "Project Blue Bridge を含む入力を確認してください。",
            technicalDetail: "Worker failed near taro@example.com and Project Blue Bridge"
          }
        });
      }
    });
    const service = createLocalLlmRuntimeService({ modelId: "test-model", analyzer });

    const result = await service.analyze({
      input: "連絡先は taro@example.com です。Project Blue Bridge の提案メモも含みます。"
    });
    const serializedResult = JSON.stringify(result);
    const serializedStatus = JSON.stringify(service.status());

    for (const text of ["taro@example.com", "Project", "Blue", "Bridge"]) {
      expect(serializedResult).not.toContain(text);
      expect(serializedStatus).not.toContain(text);
    }
  });

  it("prepare失敗時も埋め込み済みのエラー種別を保持する", async () => {
    const analyzer = createAnalyzer({
      async prepare(): Promise<void> {
        throw Object.assign(new Error("WebGPUアダプタを取得できませんでした。"), {
          llmErrorDetail: {
            kind: "webgpu",
            message: "WebGPUアダプタを取得できませんでした。",
            hint: "chrome://gpu のDawn Infoを確認してください。"
          }
        });
      }
    });
    const service = createLocalLlmRuntimeService({ modelId: "test-model", analyzer });

    await expect(service.prepare()).rejects.toThrow("WebGPUアダプタを取得できませんでした。");

    expect(service.status()).toMatchObject({
      phase: "error",
      ready: false,
      errorDetail: {
        kind: "webgpu"
      }
    });
  });

  it("disposeでdisposed状態へ移る", async () => {
    const analyzer = createAnalyzer({ ready: true });
    const service = createLocalLlmRuntimeService({ modelId: "test-model", analyzer });

    await service.dispose();

    expect(service.status()).toMatchObject({
      phase: "disposed",
      ready: false,
      modelId: "test-model",
      message: "AI文脈チェックを終了しました。"
    });
  });

  it("disposeは下層の破棄完了を待ってから状態を更新する", async () => {
    let disposeResolved = false;
    let releaseDispose: (() => void) | null = null;
    const analyzer = createAnalyzer({
      ready: true,
      async dispose(): Promise<void> {
        await new Promise<void>((resolve) => {
          releaseDispose = resolve;
        });
        disposeResolved = true;
      }
    });
    const service = createLocalLlmRuntimeService({ modelId: "test-model", analyzer });

    const disposePromise = service.dispose();
    await Promise.resolve();

    expect(disposeResolved).toBe(false);
    expect(service.status().phase).not.toBe("disposed");

    releaseDispose?.();
    await disposePromise;

    expect(disposeResolved).toBe(true);
    expect(service.status().phase).toBe("disposed");
  });
});
