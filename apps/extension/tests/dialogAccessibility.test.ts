import { afterEach, describe, expect, it, vi } from "vitest";
import { setupDialogAccessibility } from "../src/lib/dialogAccessibility";

type KeydownHandler = (event: KeyboardEvent) => void;

class FakeHTMLElement {
  tabIndex = 0;
  focused = false;
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, KeydownHandler[]>();
  focusables: FakeHTMLElement[] = [];

  constructor(private readonly ownerDocument: { activeElement: unknown }) {}

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  querySelectorAll(): FakeHTMLElement[] {
    return this.focusables;
  }

  addEventListener(type: string, handler: KeydownHandler): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), handler]);
  }

  removeEventListener(type: string, handler: KeydownHandler): void {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((item) => item !== handler)
    );
  }

  focus(): void {
    this.focused = true;
    this.ownerDocument.activeElement = this;
  }

  getRootNode(): unknown {
    return this.ownerDocument;
  }

  dispatchKeydown(event: Pick<KeyboardEvent, "key" | "shiftKey" | "preventDefault">): void {
    for (const handler of this.listeners.get("keydown") ?? []) {
      handler(event as KeyboardEvent);
    }
  }
}

function setupFakeDom() {
  const fakeDocument = { activeElement: null as unknown };
  vi.stubGlobal("HTMLElement", FakeHTMLElement);
  vi.stubGlobal("ShadowRoot", class {});
  vi.stubGlobal("document", fakeDocument);
  vi.stubGlobal("queueMicrotask", (callback: () => void) => callback());
  return fakeDocument;
}

describe("dialogAccessibility", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("dialog属性を付け、初期フォーカスとフォーカス復帰を行う", () => {
    const fakeDocument = setupFakeDom();
    const previous = new FakeHTMLElement(fakeDocument);
    const overlay = new FakeHTMLElement(fakeDocument);
    const dialog = new FakeHTMLElement(fakeDocument);
    const initialFocus = new FakeHTMLElement(fakeDocument);
    fakeDocument.activeElement = previous;

    const controller = setupDialogAccessibility({
      overlay: overlay as unknown as HTMLElement,
      dialog: dialog as unknown as HTMLElement,
      initialFocus: initialFocus as unknown as HTMLElement,
      onCancel: vi.fn()
    });

    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");

    controller.activate();
    expect(initialFocus.focused).toBe(true);

    controller.dispose();
    expect(previous.focused).toBe(true);
  });

  it("Tabをdialog内で循環し、Escapeでキャンセルする", () => {
    const fakeDocument = setupFakeDom();
    const overlay = new FakeHTMLElement(fakeDocument);
    const dialog = new FakeHTMLElement(fakeDocument);
    const first = new FakeHTMLElement(fakeDocument);
    const last = new FakeHTMLElement(fakeDocument);
    const onCancel = vi.fn();
    dialog.focusables = [first, last];

    setupDialogAccessibility({
      overlay: overlay as unknown as HTMLElement,
      dialog: dialog as unknown as HTMLElement,
      onCancel
    });

    fakeDocument.activeElement = last;
    const tabEvent = { key: "Tab", shiftKey: false, preventDefault: vi.fn() };
    overlay.dispatchKeydown(tabEvent);
    expect(tabEvent.preventDefault).toHaveBeenCalled();
    expect(first.focused).toBe(true);

    const escapeEvent = { key: "Escape", shiftKey: false, preventDefault: vi.fn() };
    overlay.dispatchKeydown(escapeEvent);
    expect(escapeEvent.preventDefault).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
