import { defineConfig } from "wxt";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const targetMatches = [
  "https://chatgpt.com/*",
  "https://chat.openai.com/*",
  "https://claude.ai/*",
  "https://gemini.google.com/*",
  "https://www.perplexity.ai/*"
];

export default defineConfig({
  manifestVersion: 3,
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    resolve: {
      alias: {
        "@harumae/core": resolve(fileURLToPath(new URL(".", import.meta.url)), "../../packages/core/src/index.ts"),
        "@harumae/llm": resolve(fileURLToPath(new URL(".", import.meta.url)), "../../packages/llm/src/index.ts")
      }
    },
    worker: {
      format: "es"
    }
  }),
  manifest: {
    name: "貼るまえ",
    description: "AIに貼る前に、個人情報・秘密情報・APIキーの消し忘れをブラウザ内で確認します。",
    version: "0.1.0",
    permissions: ["storage"],
    host_permissions: targetMatches,
    action: {
      default_title: "貼るまえ"
    },
    web_accessible_resources: [
      {
        resources: ["llm-worker.js"],
        matches: targetMatches
      }
    ],
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; worker-src 'self'"
    }
  }
});
