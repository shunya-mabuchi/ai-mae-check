import { createRoot } from "react-dom/client";
import { PasteReviewDialog } from "../ui/PasteReviewDialog";
import { pasteReviewModalCss } from "./modalStyles";
import { initializePasteReviewModalController } from "./pasteReviewModalController";
import { createPasteReviewModalCopy } from "./pasteReviewModalCopy";
import {
  PASTE_REVIEW_LLM_INITIAL_MESSAGE
} from "./pasteReviewLlmState";
import type {
  PasteReviewModalDecision,
  PasteReviewModalOptions
} from "./pasteReviewModalTypes";
import { createPasteReviewSummaryItems } from "./pasteReviewSummaryView";
import { createReactShadowHost } from "./shadowHost";

export type { PasteReviewModalDecision, PasteReviewModalOptions } from "./pasteReviewModalTypes";

export async function showPasteReviewModal(
  options: PasteReviewModalOptions
): Promise<PasteReviewModalDecision> {
  return new Promise((resolve) => {
    const restoreFocusTarget =
      document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    const mounted = createReactShadowHost(pasteReviewModalCss);
    mounted.host.dataset.aiMaeCheckUi = "paste-review";
    const root = createRoot(mounted.rootContainer);
    const modalCopy = createPasteReviewModalCopy(options.mode ?? "default");
    let closed = false;
    let finalized = false;
    let controller: { dispose: () => void } | undefined;

    const beginClosing = () => {
      if (closed) {
        return;
      }
      closed = true;
      controller?.dispose();
    };

    const finish = (decision: PasteReviewModalDecision) => {
      if (finalized) {
        return;
      }
      finalized = true;
      beginClosing();
      queueMicrotask(() => {
        try {
          root.unmount();
        } finally {
          mounted.cleanup();
          // ChromeでShadow DOM境界を越えた復帰がbodyに落ちた場合だけ補完する。
          if (
            restoreFocusTarget?.isConnected &&
            document.activeElement === document.body
          ) {
            restoreFocusTarget.focus({ preventScroll: true });
          }
          resolve(decision);
        }
      });
    };

    root.render(
      <PasteReviewDialog
        modalCopy={modalCopy}
        summaryItems={createPasteReviewSummaryItems(options.detection.summary)}
        initialLlmMessage={PASTE_REVIEW_LLM_INITIAL_MESSAGE}
        portalContainer={mounted.portalContainer}
        onReady={(elements, close) => {
          if (closed) {
            return;
          }
          controller = initializePasteReviewModalController({
            ...options,
            elements,
            close,
            isClosed: () => closed
          });
        }}
        onClosing={beginClosing}
        onClosed={finish}
      />
    );
  });
}
