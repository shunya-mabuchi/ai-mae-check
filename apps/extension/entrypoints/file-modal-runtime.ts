import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import { showFilePreflightModal } from "../src/ui/fileModal";
import { registerFileModalRuntime } from "../src/ui/fileModalRuntimeContract";

export default defineUnlistedScript(() => {
  registerFileModalRuntime(globalThis, { showFilePreflightModal });
});
