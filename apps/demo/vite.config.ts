import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@ai-mae-check/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)),
      "@ai-mae-check/llm": fileURLToPath(new URL("../../packages/llm/src/index.ts", import.meta.url))
    }
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
