import { describe, expect, it } from "vitest";
import { isWasmContextWorkerRequest } from "../src/wasmWorkerProtocol";

describe("CPU文脈チェックWorkerプロトコル", () => {
  it("解析リクエストだけを受け付ける", () => {
    expect(
      isWasmContextWorkerRequest({
        type: "analyze",
        requestId: "wasm-1",
        input: "本文です。",
        maxCandidates: 6
      })
    ).toBe(true);
    expect(
      isWasmContextWorkerRequest({
        type: "analyze",
        requestId: "",
        input: "本文です。"
      })
    ).toBe(false);
    expect(
      isWasmContextWorkerRequest({
        type: "analyze",
        requestId: "wasm-2",
        input: 123
      })
    ).toBe(false);
  });
});
