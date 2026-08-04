import { describe, expect, it } from "vitest";
import { classifyLlmErrorSignal, getLlmErrorSignalCopy } from "../src/errorSignals";

describe("AI文脈チェックのエラー分類", () => {
  it.each([
    ["Failed to fetch https://huggingface.co/model", "model_fetch"],
    ["QuotaExceededError: storage quota", "storage"],
    ["out of memory", "memory"],
    ["Failed to construct Worker", "worker"],
    ["no available backend found for wasm", "wasm"],
    ["AbortError: request timed out", "timeout"]
  ] as const)("%s を %s に分類する", (message, kind) => {
    expect(classifyLlmErrorSignal(message).kind).toBe(kind);
  });

  it("不明なエラーは汎用メッセージにする", () => {
    expect(classifyLlmErrorSignal("unexpected")).toEqual(getLlmErrorSignalCopy("unknown"));
  });

  it("どの分類でもルールベース継続を案内する", () => {
    expect(getLlmErrorSignalCopy("wasm").message).toContain("ルールベースの検出結果は引き続き利用できます");
  });
});
