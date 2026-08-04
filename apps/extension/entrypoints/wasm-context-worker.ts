import { startWasmContextWorker } from "@ai-mae-check/llm/wasm-worker";
import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";

export default defineUnlistedScript(() => {
  startWasmContextWorker({
    wasmRootUrl: new URL("./", self.location.href).href
  });
});
