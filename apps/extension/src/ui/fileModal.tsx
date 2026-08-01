import { createRoot } from "react-dom/client";
import { createReactShadowHost } from "../lib/shadowHost";
import { FilePreflightDialog } from "./FilePreflightDialog";
import { filePreflightModalCss } from "./fileModalStyles";
import type { FilePreflightModalDecision, FilePreflightModalOptions } from "./fileModalTypes";

export type { FilePreflightModalDecision, FilePreflightModalItem, FilePreflightModalOptions } from "./fileModalTypes";

export async function showFilePreflightModal(
  options: FilePreflightModalOptions,
  restoreFocusTarget?: HTMLElement
): Promise<FilePreflightModalDecision> {
  return new Promise((resolve) => {
    const mounted = createReactShadowHost(filePreflightModalCss);
    mounted.host.dataset.aiMaeCheckUi = "file-preflight";
    const root = createRoot(mounted.rootContainer);
    let finished = false;

    const finish = (decision: FilePreflightModalDecision) => {
      if (finished) {
        return;
      }

      finished = true;
      queueMicrotask(() => {
        try {
          root.unmount();
        } finally {
          mounted.cleanup();
          // React Ariaの復帰後もbodyに残るChromeのShadow DOM境界だけを補完する。
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
      <FilePreflightDialog
        options={options}
        portalContainer={mounted.portalContainer}
        onDecision={finish}
      />
    );
  });
}
