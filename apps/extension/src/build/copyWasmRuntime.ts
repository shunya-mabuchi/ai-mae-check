import { copyFile } from "node:fs/promises";
import { resolve } from "node:path";

export const ONNX_WASM_FILE = "ort-wasm-simd-threaded.wasm";

export async function copyWasmRuntime(
  outputDirectory: string,
  sourceDirectory: string
): Promise<void> {
  await copyFile(
    resolve(sourceDirectory, ONNX_WASM_FILE),
    resolve(outputDirectory, ONNX_WASM_FILE)
  );
}
