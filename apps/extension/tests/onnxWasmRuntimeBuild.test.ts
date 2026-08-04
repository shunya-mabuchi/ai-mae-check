import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  copyWasmRuntime,
  ONNX_WASM_FILES
} from "../src/build/copyWasmRuntime";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  );
});

describe("ONNX Runtime Webの拡張ビルド", () => {
  it("CPU専用のwasm entryへ解決する", async () => {
    const source = await readFile(resolve(process.cwd(), "wxt.config.ts"), "utf8");

    expect(source).toContain("find: /^onnxruntime-web$/");
    expect(source).toContain('"ort.wasm.min.mjs"');
  });

  it("非JSEP版のローダーとWASMを同梱する", async () => {
    const root = await mkdtemp(join(tmpdir(), "ai-mae-onnx-runtime-"));
    temporaryDirectories.push(root);
    const sourceDirectory = join(root, "source");
    const outputDirectory = join(root, "output");
    await Promise.all([
      mkdir(sourceDirectory, { recursive: true }),
      mkdir(outputDirectory, { recursive: true })
    ]);

    for (const fileName of ONNX_WASM_FILES) {
      await writeFile(join(sourceDirectory, fileName), fileName, "utf8");
    }

    await copyWasmRuntime(outputDirectory, sourceDirectory);

    for (const fileName of ONNX_WASM_FILES) {
      await expect(readFile(join(outputDirectory, fileName), "utf8")).resolves.toBe(fileName);
      expect(fileName).not.toContain(".jsep.");
    }
  });
});
