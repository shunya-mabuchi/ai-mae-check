import { vi } from "vitest";

type Listener = () => void;

export class FakeElement {
  className = "";
  textContent = "";
  type = "";
  checked = false;
  title = "";
  readonly style = { cssText: "" };
  readonly children: FakeElement[] = [];
  private readonly attributes = new Map<string, string>();
  private readonly listeners = new Map<string, Listener[]>();

  constructor(readonly tagName: string) {}

  append(...children: FakeElement[]): void {
    this.children.push(...children);
  }

  replaceChildren(...children: FakeElement[]): void {
    this.children.splice(0, this.children.length, ...children);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const listeners = this.listeners.get(type) ?? [];
    if (typeof listener === "function") {
      listeners.push(() => listener(new Event(type)));
    } else {
      listeners.push(() => listener.handleEvent(new Event(type)));
    }
    this.listeners.set(type, listeners);
  }

  dispatch(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener();
    }
  }

  emit(type: string): void {
    this.dispatch(type);
  }
}

export function stubFakeDocument(factory: (tagName: string) => FakeElement = (tagName) => new FakeElement(tagName)) {
  const createElement = vi.fn(factory);
  vi.stubGlobal("document", { createElement });
  return createElement;
}

export function allElements(root: FakeElement): FakeElement[] {
  return [root, ...root.children.flatMap(allElements)];
}

export function joinedText(root: FakeElement): string {
  return allElements(root)
    .map((element) => element.textContent)
    .filter((text) => text.length > 0)
    .join("\n");
}

export function asDomElement<T>(element: unknown): T {
  return element as unknown as T;
}
