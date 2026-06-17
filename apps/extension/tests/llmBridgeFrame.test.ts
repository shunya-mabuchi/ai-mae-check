import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BRIDGE_LOAD_TIMEOUT_MS,
  createLlmBridgeIframe,
  waitForLlmBridgeIframeLoad
} from "../src/lib/llmBridgeFrame";

class FakeIframe {
  title = "";
  readonly attributes = new Map<string, string>();
  readonly style = { cssText: "" };
  private readonly listeners = new Map<string, Array<() => void>>();

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  addEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  emit(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener();
    }
  }
}

describe("llmBridgeFrame", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("AI文脈チェック用のhidden iframe属性を作る", () => {
    const fakeIframe = new FakeIframe();
    const createElement = vi.fn(() => fakeIframe);
    vi.stubGlobal("document", { createElement });

    const iframe = createLlmBridgeIframe();

    expect(createElement).toHaveBeenCalledWith("iframe");
    expect(iframe).toBe(fakeIframe);
    expect(fakeIframe.title).toBe("AIまえチェック AI文脈チェック");
    expect(fakeIframe.attributes.get("aria-hidden")).toBe("true");
    expect(fakeIframe.style.cssText).toContain("position: fixed");
    expect(fakeIframe.style.cssText).toContain("width: 0");
    expect(fakeIframe.style.cssText).toContain("height: 0");
    expect(fakeIframe.style.cssText).toContain("left: -9999px");
    expect(fakeIframe.style.cssText).toContain("pointer-events: none");
  });

  it("iframeのloadイベントでロード待ちを解決する", async () => {
    const fakeIframe = new FakeIframe();
    const promise = waitForLlmBridgeIframeLoad(fakeIframe as unknown as HTMLIFrameElement);

    fakeIframe.emit("load");

    await expect(promise).resolves.toBeUndefined();
  });

  it("iframeのloadイベントが来なければタイムアウトする", async () => {
    vi.useFakeTimers();
    const fakeIframe = new FakeIframe();
    const promise = waitForLlmBridgeIframeLoad(fakeIframe as unknown as HTMLIFrameElement, 10);
    const assertion = expect(promise).rejects.toThrow("AI文脈チェック用の拡張ページを準備できませんでした。");

    await vi.advanceTimersByTimeAsync(10);

    await assertion;
  });

  it("標準タイムアウト値を公開する", () => {
    expect(BRIDGE_LOAD_TIMEOUT_MS).toBe(15000);
  });
});
