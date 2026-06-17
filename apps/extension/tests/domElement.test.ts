import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "../src/lib/domElement";

interface FakeElement {
  tagName: string;
  className: string;
  textContent: string;
}

function stubDocument() {
  const createElementMock = vi.fn((tagName: string): FakeElement => ({
    tagName,
    className: "",
    textContent: ""
  }));
  vi.stubGlobal("document", { createElement: createElementMock });
  return createElementMock;
}

describe("domElement", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("classNameとtextContentを持つ要素を作る", () => {
    const createElementMock = stubDocument();
    const element = createElement("button", "amc-button", "安全化して送信") as unknown as FakeElement;

    expect(createElementMock).toHaveBeenCalledWith("button");
    expect(element.tagName).toBe("button");
    expect(element.className).toBe("amc-button");
    expect(element.textContent).toBe("安全化して送信");
  });

  it("textが未指定なら空のtextContentのままにする", () => {
    stubDocument();
    const element = createElement("div", "amc-panel") as unknown as FakeElement;

    expect(element.className).toBe("amc-panel");
    expect(element.textContent).toBe("");
  });
});
