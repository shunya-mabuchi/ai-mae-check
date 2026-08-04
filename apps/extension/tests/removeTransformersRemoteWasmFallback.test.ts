import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  removeTransformersRemoteWasmFallback,
  TRANSFORMERS_REMOTE_WASM_PREFIX
} from "../src/build/removeTransformersRemoteWasmFallback";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  );
});

describe("removeTransformersRemoteWasmFallback", () => {
  it("生成Workerに残る外部WASMの既定URLをローカル相対URLへ置換する", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ai-mae-wasm-worker-"));
    temporaryDirectories.push(directory);
    const workerPath = join(directory, "wasm-context-worker.js");
    await writeFile(
      workerPath,
      'backend.wasmPaths=`https://cdn.jsdelivr.net/npm/@huggingface/transformers@${env.version}/dist/`;',
      "utf8"
    );

    await removeTransformersRemoteWasmFallback(directory);

    const output = await readFile(workerPath, "utf8");
    expect(output).not.toContain(TRANSFORMERS_REMOTE_WASM_PREFIX);
    expect(output).toContain("backend.wasmPaths=`./`");
  });
});
