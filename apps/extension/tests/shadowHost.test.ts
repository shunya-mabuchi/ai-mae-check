import { afterEach, describe, expect, it, vi } from "vitest";
import { createShadowHost } from "../src/lib/shadowHost";

interface FakeElement {
  tagName: string;
  textContent: string;
  children: FakeElement[];
  removed: boolean;
  attachedMode?: string;
  append: (...children: FakeElement[]) => void;
  remove: () => void;
  attachShadow?: (options: ShadowRootInit) => FakeElement;
}

function fakeElement(tagName: string): FakeElement {
  return {
    tagName,
    textContent: "",
    children: [],
    removed: false,
    append(...children) {
      this.children.push(...children);
    },
    remove() {
      this.removed = true;
    }
  };
}

describe("createShadowHost", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Shadow DOMホストにCSSを注入してdocumentへ追加する", () => {
    const host = fakeElement("div");
    const shadow = fakeElement("#shadow-root");
    const style = fakeElement("style");
    const documentElement = fakeElement("html");
    host.attachShadow = (options) => {
      host.attachedMode = options.mode;
      return shadow;
    };

    vi.stubGlobal("document", {
      createElement: vi.fn((tagName: string) => (tagName === "style" ? style : host)),
      documentElement
    });

    const mounted = createShadowHost(".modal { color: red; }");

    expect(host.attachedMode).toBe("open");
    expect(style.textContent).toBe(".modal { color: red; }");
    expect(shadow.children).toEqual([style]);
    expect(documentElement.children).toEqual([host]);

    mounted.cleanup();

    expect(host.removed).toBe(true);
  });
});
