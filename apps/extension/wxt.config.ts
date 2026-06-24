import { defineConfig } from "wxt";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

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
  vite: () => ({
    define: {
      __AI_MAE_EXTENSION_E2E__: JSON.stringify(isExtensionE2eBuild)
    },
    resolve: {
      alias: {
        "@ai-mae-check/core": resolve(fileURLToPath(new URL(".", import.meta.url)), "../../packages/core/src/index.ts"),
        "@ai-mae-check/llm": resolve(fileURLToPath(new URL(".", import.meta.url)), "../../packages/llm/src/index.ts")
      }
    },
    worker: {
      format: "es"
    }
  }),
  manifest: {
    name: "AIまえチェック",
    description: "AIに送る前に、個人情報・秘密情報・APIキーの消し忘れをブラウザ内で確認します。",
    version: "0.1.1",
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
        resources: ["llm-worker.js", "llm-bridge.html"],
        matches: manifestMatches
      }
    ],
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; worker-src 'self'; connect-src 'self' https://huggingface.co https://*.huggingface.co https://hf.co https://*.hf.co https://raw.githubusercontent.com https://*.githubusercontent.com https://*.xethub.hf.co https://cdn-lfs.huggingface.co"
    }
  }
});
