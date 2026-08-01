import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import { showPasteReviewModal } from "../src/lib/modal";
import { showSendConfirmModal } from "../src/ui/confirmModal";
import { registerReviewModalRuntime } from "../src/ui/reviewModalRuntimeContract";

export default defineUnlistedScript(() => {
  registerReviewModalRuntime(globalThis, { showPasteReviewModal, showSendConfirmModal });
});
