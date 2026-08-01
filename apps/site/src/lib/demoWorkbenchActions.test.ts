import { describe, expect, it } from "vitest";
import { createDemoWorkbenchActions, isDemoLlmBusy } from "./demoWorkbenchActions";
import type { LlmStatus } from "./demoConstants";

describe("createDemoWorkbenchActions", () => {
  it("デモの操作ボタンを既存の表示順と文言で返す", () => {
    const actions = createDemoWorkbenchActions({
      llmStatus: "idle",
      hasMaskedText: false
    });

    expect(actions.map((action) => action.id)).toEqual([
      "sample_rules",
      "sample_context",
      "detect_rules",
      "check_context",
      "copy_masked",
      "reset"
    ]);
    expect(actions.map((action) => action.label)).toEqual([
      "ルール用サンプル",
      "文脈用サンプル",
      "検出する",
      "AI文脈チェック",
      "コピー",
      "リセット"
    ]);
    expect(actions.map((action) => action.icon)).toEqual([
      "clipboard",
      "sparkles",
      "shield_check",
      "sparkles",
      "wand",
      "refresh"
    ]);
  });

  it("AI文脈チェックはモデル準備中と確認中だけdisabledにする", () => {
    const statuses: LlmStatus[] = ["idle", "loading", "analyzing", "done", "empty", "error"];

    const disabledByStatus = Object.fromEntries(
      statuses.map((status) => [
        status,
        createDemoWorkbenchActions({
          llmStatus: status,
          hasMaskedText: true
        }).find((action) => action.id === "check_context")?.disabled
      ])
    );

    expect(disabledByStatus).toEqual({
      idle: false,
      loading: true,
      analyzing: true,
      done: false,
      empty: false,
      error: false
    });
  });

  it("コピーはマスク済みテキストがあるときだけ有効にする", () => {
    const emptyCopy = createDemoWorkbenchActions({
      llmStatus: "idle",
      hasMaskedText: false
    }).find((action) => action.id === "copy_masked");
    const readyCopy = createDemoWorkbenchActions({
      llmStatus: "idle",
      hasMaskedText: true
    }).find((action) => action.id === "copy_masked");

    expect(emptyCopy?.disabled).toBe(true);
    expect(readyCopy?.disabled).toBe(false);
  });

  it("既存のボタンvariantと白抜きヘッダー用classNameを維持する", () => {
    const actions = createDemoWorkbenchActions({
      llmStatus: "idle",
      hasMaskedText: true
    });

    expect(actions.find((action) => action.id === "detect_rules")?.variant).toBe("secondary");
    expect(actions.find((action) => action.id === "check_context")?.className).toContain("bg-white text-ink");
    expect(actions.filter((action) => action.variant === "ghost")).toHaveLength(5);
  });
});

describe("isDemoLlmBusy", () => {
  it("loading/analyzingを実行中として扱う", () => {
    expect(isDemoLlmBusy("loading")).toBe(true);
    expect(isDemoLlmBusy("analyzing")).toBe(true);
    expect(isDemoLlmBusy("idle")).toBe(false);
  });
});
