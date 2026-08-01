import { afterEach, describe, expect, it, vi } from "vitest";
import { createReactShadowHost, createShadowHost } from "../src/lib/shadowHost";

interface FakeElement {
  tagName: string;
  textContent: string;
  className: string;
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
    className: "",
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

  it("React rootとPortal専用コンテナをShadow Root内に作る", () => {
    const host = fakeElement("div");
    const rootContainer = fakeElement("div");
    const portalContainer = fakeElement("div");
    const shadow = fakeElement("#shadow-root");
    const style = fakeElement("style");
    const documentElement = fakeElement("html");
    const divs = [host, rootContainer, portalContainer];
    host.attachShadow = () => shadow;

    vi.stubGlobal("document", {
      createElement: vi.fn((tagName: string) => (tagName === "style" ? style : divs.shift())),
      documentElement
    });

    const mounted = createReactShadowHost(".modal { color: red; }");

    expect(rootContainer.className).toBe("amc-react-root");
    expect(portalContainer.className).toBe("amc-portal-root");
    expect(shadow.children).toEqual([style, rootContainer, portalContainer]);
    expect(mounted.rootContainer).toBe(rootContainer);
    expect(mounted.portalContainer).toBe(portalContainer);
  });
});
