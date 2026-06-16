import { describe, expect, it } from "vitest";
import { EXTENSION_RUNTIME_UNAVAILABLE_MESSAGE, getExtensionResourceUrl } from "../src/lib/extensionRuntime";

describe("extensionRuntime", () => {
  it("chrome.runtime.getURLで拡張リソースURLを解決する", () => {
    const runtime = {
      getURL: (path: string) => `chrome-extension://example/${path}`
    };

    expect(getExtensionResourceUrl("llm-bridge.html", runtime)).toBe("chrome-extension://example/llm-bridge.html");
  });

  it("chrome.runtime.getURLが使えない場合は診断可能な日本語エラーにする", () => {
    expect(() => getExtensionResourceUrl("llm-worker.js", undefined)).toThrow(EXTENSION_RUNTIME_UNAVAILABLE_MESSAGE);
  });
});
