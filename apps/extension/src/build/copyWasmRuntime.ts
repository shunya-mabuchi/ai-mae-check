import { copyFile } from "node:fs/promises";
import { resolve } from "node:path";

export const ONNX_WASM_FILES = [
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm"
] as const;

export async function copyWasmRuntime(
  outputDirectory: string,
  sourceDirectory: string
): Promise<void> {
  await Promise.all(
    ONNX_WASM_FILES.map((fileName) =>
      copyFile(resolve(sourceDirectory, fileName), resolve(outputDirectory, fileName))
    )
  );
}
