import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
