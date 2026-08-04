import { startWasmContextWorker } from "@ai-mae-check/llm/wasm-worker";

startWasmContextWorker({
  wasmRootUrl: new URL(import.meta.env.BASE_URL, self.location.origin).href
});
