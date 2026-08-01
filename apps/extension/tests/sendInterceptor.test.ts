import { afterEach, describe, expect, it, vi } from "vitest";
import type { SiteAdapter } from "../src/content/adapters/baseAdapter";
import {
  createSubmitBypass,
  installSendInterceptor,
  isDefaultSendKeyboardEvent
} from "../src/content/dom/sendInterceptor";

class FakeNode extends EventTarget {
  contains(node: Node | null): boolean {
    return node === this;
  }
}

class FakeRoot extends FakeNode {
  readonly documentElement = this;
  clickHandler: ((event: MouseEvent) => void) | null = null;

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (type === "click" && typeof listener === "function") {
      this.clickHandler = listener as (event: MouseEvent) => void;
    }
  }

  removeEventListener(type: string): void {
    if (type === "click") {
      this.clickHandler = null;
    }
  }
}

class FakeMutationObserver {
  observe(): void {}
  disconnect(): void {}
}

function createClickEvent(target: EventTarget): MouseEvent {
  return {
    target,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    stopImmediatePropagation: vi.fn()
  } as unknown as MouseEvent;
}

describe("sendInterceptor", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("bypass flag is consumed once to avoid submit loops", () => {
    const bypass = createSubmitBypass();

    expect(bypass.consume()).toBe(false);
    bypass.arm();
    expect(bypass.consume()).toBe(true);
    expect(bypass.consume()).toBe(false);
  });

  it("Enter送信を検出し、Shift+EnterとIME入力中は除外する", () => {
    expect(isDefaultSendKeyboardEvent({ key: "Enter", shiftKey: false, altKey: false, isComposing: false })).toBe(true);
    expect(isDefaultSendKeyboardEvent({ key: "Enter", shiftKey: true, altKey: false, isComposing: false })).toBe(false);
    expect(isDefaultSendKeyboardEvent({ key: "Enter", shiftKey: false, altKey: false, isComposing: true })).toBe(false);
    expect(isDefaultSendKeyboardEvent({ key: "a", shiftKey: false, altKey: false, isComposing: false })).toBe(false);
  });

  it("確認処理が失敗しても送信せず、次の操作で再試行できる", async () => {
    const root = new FakeRoot();
    const editor = new FakeNode();
    const sendButton = new FakeNode();
    const submit = vi.fn();
    const review = vi
      .fn()
      .mockRejectedValueOnce(new Error("確認処理に失敗"))
      .mockResolvedValueOnce({ type: "replaceAndSubmit", text: "安全化済み" });
    const adapter: SiteAdapter = {
      id: "chatgpt",
      findEditor: () => editor as unknown as HTMLTextAreaElement,
      findSendButton: () => sendButton as unknown as HTMLElement,
      isSendKeyboardEvent: () => false,
      readText: () => "taro@example.com",
      replaceText: vi.fn(),
      submit
    };

    vi.stubGlobal("Node", FakeNode);
    vi.stubGlobal("MutationObserver", FakeMutationObserver);
    vi.stubGlobal("window", {
      requestAnimationFrame(callback: FrameRequestCallback) {
        callback(0);
        return 1;
      },
      setTimeout(callback: () => void) {
        callback();
        return 1;
      }
    });

    const cleanup = installSendInterceptor({
      adapter,
      isEnabled: () => true,
      prepareReview: (text) => text,
      review,
      root: root as unknown as Document
    });

    root.clickHandler?.(createClickEvent(sendButton));
    await vi.waitFor(() => expect(review).toHaveBeenCalledTimes(1));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(submit).not.toHaveBeenCalled();

    root.clickHandler?.(createClickEvent(sendButton));
    await vi.waitFor(() => expect(review).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(submit).toHaveBeenCalledTimes(1));

    cleanup();
  });
});
