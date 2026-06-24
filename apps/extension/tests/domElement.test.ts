import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "../src/lib/domElement";
import { asDomElement, FakeElement, stubFakeDocument } from "./helpers/fakeDom";

describe("domElement", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("classNameとtextContentを持つ要素を作る", () => {
    const createElementMock = stubFakeDocument();
    const element = asDomElement<HTMLElement>(createElement("button", "amc-button", "安全化して送信"));

    expect(createElementMock).toHaveBeenCalledWith("button");
    expect(element.tagName).toBe("button");
    expect(element.className).toBe("amc-button");
    expect(element.textContent).toBe("安全化して送信");
  });

  it("textが未指定なら空のtextContentのままにする", () => {
    stubFakeDocument();
    const element = asDomElement<FakeElement>(createElement("div", "amc-panel"));

    expect(element.className).toBe("amc-panel");
    expect(element.textContent).toBe("");
  });
});
