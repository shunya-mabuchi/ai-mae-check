import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("llm-worker entrypoint", () => {
  it("WebLLM Worker本体を公開subpathから読み込み、余分なWorker成果物を増やさない", () => {
    const source = readFileSync(resolve(process.cwd(), "entrypoints/llm-worker.ts"), "utf8");

    expect(source).toContain('import "@ai-mae-check/llm/worker";');
    expect(source).not.toContain("packages/llm/src/worker");
    expect(source).not.toContain("@mlc-ai/web-llm");
  });
});
