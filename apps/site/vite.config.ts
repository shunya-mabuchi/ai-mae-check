import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

const siteRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  base: "/ai-mae-check/",
  plugins: [react()],
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
        find: "@ai-mae-check/llm/runtime",
        replacement: fileURLToPath(new URL("../../packages/llm/src/runtime.ts", import.meta.url))
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
