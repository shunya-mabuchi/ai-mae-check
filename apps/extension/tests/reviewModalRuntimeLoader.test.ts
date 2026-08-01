import { describe, expect, it, vi } from "vitest";
import {
  createReviewModalRuntimeLoader,
  REVIEW_MODAL_LOAD_FAILURE_MESSAGE
} from "../src/ui/reviewModalRuntimeLoader";
import {
  REVIEW_MODAL_RUNTIME_GLOBAL,
  registerReviewModalRuntime,
  type ReviewModalRuntimeModule
} from "../src/ui/reviewModalRuntimeContract";

function createTarget(): typeof globalThis {
  return {} as typeof globalThis;
}

function createRuntime(): ReviewModalRuntimeModule {
  return {
    showPasteReviewModal: vi.fn(async () => ({ type: "cancel" as const })),
    showSendConfirmModal: vi.fn(async () => ({ type: "cancel" as const }))
  };
}

describe("貼り付け確認モーダルの遅延ランタイム", () => {
  it("読込済みならモジュールを再取得しない", async () => {
    const target = createTarget();
    const runtime = createRuntime();
    const importModule = vi.fn();
    registerReviewModalRuntime(target, runtime);

    const load = createReviewModalRuntimeLoader();
    await expect(load({ moduleUrl: "review-modal-runtime.js", target, importModule }))
      .resolves.toBe(runtime);
    expect(importModule).not.toHaveBeenCalled();
  });

  it("import失敗後は拒否Promiseを保持せず再試行できる", async () => {
    const target = createTarget();
    const runtime = createRuntime();
    const importModule = vi
      .fn<(_: string) => Promise<unknown>>()
      .mockRejectedValueOnce(new Error("一時的な読込失敗"))
      .mockImplementationOnce(async () => {
        registerReviewModalRuntime(target, runtime);
      });
    const load = createReviewModalRuntimeLoader();

    await expect(load({ moduleUrl: "review-modal-runtime.js", target, importModule }))
      .rejects.toThrow("一時的な読込失敗");
    await expect(load({ moduleUrl: "review-modal-runtime.js", target, importModule }))
      .resolves.toBe(runtime);
    expect(importModule).toHaveBeenCalledTimes(2);
  });

  it("グローバル登録がない場合も失敗し、次回は再試行できる", async () => {
    const target = createTarget();
    const runtime = createRuntime();
    const importModule = vi
      .fn<(_: string) => Promise<unknown>>()
      .mockResolvedValueOnce(undefined)
      .mockImplementationOnce(async () => {
        registerReviewModalRuntime(target, runtime);
      });
    const load = createReviewModalRuntimeLoader();

    await expect(load({ moduleUrl: "review-modal-runtime.js", target, importModule }))
      .rejects.toThrow("確認画面を準備できませんでした。");
    await expect(load({ moduleUrl: "review-modal-runtime.js", target, importModule }))
      .resolves.toBe(runtime);
  });

  it("利用者向けエラーは貼り付け中止と再試行方法を日本語で示す", () => {
    expect(REVIEW_MODAL_LOAD_FAILURE_MESSAGE).toContain("操作は中止しました");
    expect(REVIEW_MODAL_LOAD_FAILURE_MESSAGE).toContain("ページを再読み込みしてから再試行");
  });

  it("貼り付け専用の古いランタイムは再利用せず、現在の契約を読み込む", async () => {
    const target = {} as typeof globalThis;
    Object.assign(target, {
      [REVIEW_MODAL_RUNTIME_GLOBAL]: {
        showPasteReviewModal: vi.fn(async () => ({ type: "cancel" as const }))
      }
    });
    const runtime = createRuntime();
    const importModule = vi.fn(async () => {
      registerReviewModalRuntime(target, runtime);
    });
    const load = createReviewModalRuntimeLoader();

    await expect(load({ moduleUrl: "review-modal-runtime.js", target, importModule }))
      .resolves.toBe(runtime);
    expect(importModule).toHaveBeenCalledTimes(1);
  });
});
