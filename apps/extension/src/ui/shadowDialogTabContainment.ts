import { useEffect, type RefObject } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  '[tabindex]:not([tabindex="-1"])'
].join(",");

function visibleFocusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => {
    return !element.hidden && element.getClientRects().length > 0;
  });
}

/** ChromeのShadow DOM境界でReact AriaのTab循環が抜ける場合だけ補完する。 */
export function containShadowDialogTab(
  event: KeyboardEvent,
  dialog: HTMLElement | null
): void {
  if (event.key !== "Tab" || event.defaultPrevented || !dialog) {
    return;
  }

  const shadowRoot = dialog.getRootNode();
  if (!(shadowRoot instanceof ShadowRoot)) {
    return;
  }

  const focusableElements = visibleFocusableElements(dialog);
  const first = focusableElements[0];
  const last = focusableElements.at(-1);
  const activeElement = shadowRoot.activeElement;

  if (!first || !last || !(activeElement instanceof HTMLElement)) {
    return;
  }

  if (event.shiftKey && activeElement === first) {
    event.preventDefault();
    last.focus();
    return;
  }

  if (!event.shiftKey && activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function useShadowDialogTabContainment(dialogRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => containShadowDialogTab(event, dialog);
    dialog.addEventListener("keydown", onKeyDown);
    return () => dialog.removeEventListener("keydown", onKeyDown);
  }, [dialogRef]);
}
