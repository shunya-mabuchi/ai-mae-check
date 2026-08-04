import { defineConfig } from "wxt";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { removeUnusedWebLlmFallbackWorker } from "./src/build/removeUnusedWebLlmFallbackWorker";
import { copyWasmRuntime, ONNX_WASM_FILE } from "./src/build/copyWasmRuntime";
import { removeTransformersRemoteWasmFallback } from "./src/build/removeTransformersRemoteWasmFallback";

const extensionDirectory = fileURLToPath(new URL(".", import.meta.url));
const onnxWasmSourceDirectory = resolve(
  extensionDirectory,
  "../../packages/llm/node_modules/onnxruntime-web/dist"
);

const targetMatches = [
  "https://chatgpt.com/*",
  "https://chat.openai.com/*",
  "https://claude.ai/*",
  "https://gemini.google.com/*",
  "https://www.perplexity.ai/*",
  "https://perplexity.ai/*"
];

const extensionE2eMatches = ["http://127.0.0.1/*", "http://localhost/*"];
const isExtensionE2eBuild = process.env.EXTENSION_E2E === "1";
const manifestMatches = isExtensionE2eBuild ? [...targetMatches, ...extensionE2eMatches] : targetMatches;

export default defineConfig({
  outDir: isExtensionE2eBuild ? ".output-e2e" : ".output",
  outDirTemplate: "chrome-mv{{manifestVersion}}",
  manifestVersion: 3,
  modules: ["@wxt-dev/module-react"],
  hooks: {
    "build:done": async (wxt, output) => {
      // 拡張では公開llm-worker.jsを使うため、Viteが残す未参照fallbackだけを除去します。
      const removedWorkers = new Set(
        await removeUnusedWebLlmFallbackWorker(wxt.config.outDir)
      );
      for (const step of output.steps) {
        for (let index = step.chunks.length - 1; index >= 0; index -= 1) {
          const fileName = step.chunks[index]?.fileName.split("/").at(-1);
          if (fileName && removedWorkers.has(fileName)) {
            step.chunks.splice(index, 1);
          }
        }
      }
      await removeTransformersRemoteWasmFallback(wxt.config.outDir);
      await copyWasmRuntime(wxt.config.outDir, onnxWasmSourceDirectory);
    }
  },
  vite: () => ({
    define: {
      __AI_MAE_EXTENSION_E2E__: JSON.stringify(isExtensionE2eBuild),
      __AI_MAE_EXTERNAL_WEBLLM_WORKER_ONLY__: "true"
    },
    resolve: {
      alias: [
        {
          find: "@ai-mae-check/core",
          replacement: resolve(fileURLToPath(new URL(".", import.meta.url)), "../../packages/core/src/index.ts")
        },
        {
          find: "@ai-mae-check/llm/runtime",
          replacement: resolve(
            fileURLToPath(new URL(".", import.meta.url)),
            "../../packages/llm/src/runtime.ts"
          )
        },
        {
          find: "@ai-mae-check/llm/worker",
          replacement: resolve(
            fileURLToPath(new URL(".", import.meta.url)),
            "../../packages/llm/src/worker.ts"
          )
        },
        {
          find: "@ai-mae-check/llm/wasm-worker",
          replacement: resolve(
            extensionDirectory,
            "../../packages/llm/src/wasm-worker.ts"
          )
        },
        {
          find: /^@ai-mae-check\/llm$/,
          replacement: resolve(fileURLToPath(new URL(".", import.meta.url)), "../../packages/llm/src/index.ts")
        }
      ]
    },
    worker: {
      format: "es"
    }
  }),
  manifest: {
    name: "AIまえチェック",
    description: "AIに送る前に、個人情報・秘密情報・APIキーの消し忘れをブラウザ内で確認します。",
    version: "0.2.0",
    minimum_chrome_version: "111",
    permissions: ["storage"],
    host_permissions: manifestMatches,
    icons: {
      16: "icon/16.png",
      32: "icon/32.png",
      48: "icon/48.png",
      128: "icon/128.png"
    },
    action: {
      default_title: "AIまえチェック",
      default_icon: {
        16: "icon/16.png",
        32: "icon/32.png",
        48: "icon/48.png",
        128: "icon/128.png"
      }
    },
    web_accessible_resources: [
      {
        resources: [
          "llm-worker.js",
          "llm-bridge.html",
          "file-modal-runtime.js",
          "review-modal-runtime.js",
          "icon/16.png",
          "icon/32.png",
          "icon/48.png",
          "icon/128.png"
        ],
        matches: manifestMatches
      }
    ],
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; worker-src 'self'; connect-src 'self' https://huggingface.co https://*.huggingface.co https://hf.co https://*.hf.co https://raw.githubusercontent.com https://*.githubusercontent.com https://*.xethub.hf.co https://cdn-lfs.huggingface.co"
    }
  }
});
