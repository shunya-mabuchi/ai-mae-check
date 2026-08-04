import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export const TRANSFORMERS_REMOTE_WASM_PREFIX =
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@";

const remoteWasmTemplatePattern =
  /https:\/\/cdn\.jsdelivr\.net\/npm\/@huggingface\/transformers@\$\{[^}]+\}\/dist\//gu;

export async function removeTransformersRemoteWasmFallback(
  outputDirectory: string,
  workerFileName = "wasm-context-worker.js"
): Promise<void> {
  const workerPath = resolve(outputDirectory, workerFileName);
  const source = await readFile(workerPath, "utf8");
  const sanitized = source.replace(remoteWasmTemplatePattern, "./");

  if (sanitized.includes(TRANSFORMERS_REMOTE_WASM_PREFIX)) {
    throw new Error("Transformers.jsの外部WASMフォールバックを除去できませんでした。");
  }

  if (sanitized !== source) {
    await writeFile(workerPath, sanitized, "utf8");
  }
}
