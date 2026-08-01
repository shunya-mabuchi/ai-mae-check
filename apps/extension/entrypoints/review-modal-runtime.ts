import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import { showPasteReviewModal } from "../src/lib/modal";
import { registerReviewModalRuntime } from "../src/ui/reviewModalRuntimeContract";

export default defineUnlistedScript(() => {
  registerReviewModalRuntime(globalThis, { showPasteReviewModal });
});
