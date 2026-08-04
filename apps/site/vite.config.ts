import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { resolve } from "node:path";
import { copyFile, readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";

const siteRoot = fileURLToPath(new URL(".", import.meta.url));
const onnxWasmSourceDirectory = resolve(siteRoot, "../../packages/llm/node_modules/onnxruntime-web/dist");
const onnxWasmRuntimeFiles = ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"] as const;

function copyOnnxWasmRuntime(): Plugin {
  return {
    name: "copy-onnx-wasm-runtime",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathName = request.url?.split("?", 1)[0];
        const fileName = onnxWasmRuntimeFiles.find((candidate) => pathName?.endsWith(`/${candidate}`));
        if (!fileName) {
          next();
          return;
        }

        const body = await readFile(resolve(onnxWasmSourceDirectory, fileName));
        response.setHeader(
          "Content-Type",
          fileName.endsWith(".wasm") ? "application/wasm" : "text/javascript; charset=utf-8"
        );
        response.end(body);
      });
    },
    async closeBundle() {
      const distDirectory = resolve(siteRoot, "dist");
      await Promise.all(
        onnxWasmRuntimeFiles.map((fileName) =>
          copyFile(resolve(onnxWasmSourceDirectory, fileName), resolve(distDirectory, fileName))
        )
      );

      const assetsDirectory = resolve(distDirectory, "assets");
      const workerFileName = (await readdir(assetsDirectory)).find((fileName) =>
        /^context-worker-.*\.js$/u.test(fileName)
      );
      if (!workerFileName) {
        throw new Error("AI文脈チェック用Workerのビルド成果物が見つかりません。");
      }

      const workerPath = resolve(assetsDirectory, workerFileName);
      const workerSource = await readFile(workerPath, "utf8");
      const sanitizedWorkerSource = workerSource.replace(
        /https:\/\/cdn\.jsdelivr\.net\/npm\/@huggingface\/transformers@\$\{[^}]+\}\/dist\//gu,
        "./"
      );
      if (sanitizedWorkerSource.includes("https://cdn.jsdelivr.net/npm/@huggingface/transformers@")) {
        throw new Error("Transformers.jsの外部WASMフォールバックを除去できませんでした。");
      }
      if (sanitizedWorkerSource !== workerSource) {
        await writeFile(workerPath, sanitizedWorkerSource, "utf8");
      }
    }
  };
}

export default defineConfig({
  base: "/ai-mae-check/",
  plugins: [react(), copyOnnxWasmRuntime()],
  build: {
    rollupOptions: {
      input: {
        home: resolve(siteRoot, "index.html"),
        privacy: resolve(siteRoot, "privacy/index.html"),
        support: resolve(siteRoot, "support/index.html"),
        notFound: resolve(siteRoot, "404.html")
      }
    }
  },
  resolve: {
    alias: [
      {
        find: "@ai-mae-check/core",
        replacement: fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url))
      },
      {
        find: /^onnxruntime-web$/,
        replacement: resolve(onnxWasmSourceDirectory, "ort.wasm.min.mjs")
      },
      {
        find: "@ai-mae-check/llm/wasm-worker",
        replacement: fileURLToPath(new URL("../../packages/llm/src/wasm-worker.ts", import.meta.url))
      },
      {
        find: "@ai-mae-check/llm/shared",
        replacement: fileURLToPath(new URL("../../packages/llm/src/shared.ts", import.meta.url))
      },
      {
        find: "@ai-mae-check/llm",
        replacement: fileURLToPath(new URL("../../packages/llm/src/index.ts", import.meta.url))
      }
    ]
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"]
  },
  worker: {
    format: "es"
  },
  server: {
    port: 5173,
    host: "127.0.0.1"
  }
});
