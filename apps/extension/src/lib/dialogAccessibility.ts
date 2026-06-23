export interface DialogAccessibilityController {
  activate: () => void;
  dispose: () => void;
}

export interface SetupDialogAccessibilityOptions {
  overlay: HTMLElement;
  dialog: HTMLElement;
  initialFocus?: HTMLElement;
  onCancel: () => void;
}

const focusableSelector = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

function focusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => {
    return element.tabIndex >= 0 && !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true";
  });
}

function focusElement(element: HTMLElement | null): void {
  try {
    element?.focus({ preventScroll: true });
  } catch {
    element?.focus();
  }
}

function firstFocusable(dialog: HTMLElement): HTMLElement | null {
  return focusableElements(dialog)[0] ?? null;
}

function activeElementFor(dialog: HTMLElement): Element | null {
  const root = dialog.getRootNode();
  return typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot ? root.activeElement : document.activeElement;
}

function trapTabKey(event: KeyboardEvent, dialog: HTMLElement): void {
  const elements = focusableElements(dialog);
  if (elements.length === 0) {
    event.preventDefault();
    focusElement(dialog);
    return;
  }

  const first = elements[0];
  const last = elements[elements.length - 1];
  if (!first || !last) {
    event.preventDefault();
    focusElement(dialog);
    return;
  }
  const activeElement = activeElementFor(dialog);

  if (event.shiftKey && activeElement === first) {
    event.preventDefault();
    focusElement(last);
    return;
  }

  if (!event.shiftKey && activeElement === last) {
    event.preventDefault();
    focusElement(first);
  }
}

export function setupDialogAccessibility(options: SetupDialogAccessibilityOptions): DialogAccessibilityController {
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  options.dialog.setAttribute("role", "dialog");
  options.dialog.setAttribute("aria-modal", "true");
  options.dialog.tabIndex = -1;

  const keydownHandler = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      options.onCancel();
      return;
    }

    if (event.key === "Tab") {
      trapTabKey(event, options.dialog);
    }
  };

  options.overlay.addEventListener("keydown", keydownHandler, true);

  return {
    activate: () => {
      queueMicrotask(() => {
        focusElement(options.initialFocus ?? firstFocusable(options.dialog) ?? options.dialog);
      });
    },
    dispose: () => {
      options.overlay.removeEventListener("keydown", keydownHandler, true);
      focusElement(previousFocus);
    }
  };
}
