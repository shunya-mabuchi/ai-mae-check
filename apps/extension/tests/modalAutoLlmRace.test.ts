import { afterEach, describe, expect, it, vi } from "vitest";
import { detectSensitiveText } from "@ai-mae-check/core";
import { DEFAULT_SETTINGS } from "../src/lib/settings";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

interface FakeElement {
  textContent: string;
  hidden: boolean;
  title: string;
  append: (...children: unknown[]) => void;
  addEventListener: (type: string, listener: (event: { target: unknown }) => void) => void;
  click: () => void;
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
  toggleAttribute: (name: string, force?: boolean) => boolean;
}

interface PasteElements {
  overlay: FakeElement;
  dialog: FakeElement;
  list: FakeElement;
  preview: FakeElement;
  llmStatus: FakeElement;
  candidateList: FakeElement;
  footerNote: FakeElement;
  maskButton: FakeElement;
  llmButton: FakeElement;
  rawButton: FakeElement;
  cancelButton: FakeElement;
}

interface ConfirmElements {
  overlay: FakeElement;
  dialog: FakeElement;
  categoryList: FakeElement;
  preview: FakeElement;
  status: FakeElement;
  llmStatus: FakeElement;
  candidateList: FakeElement;
  submitButton: FakeElement;
  llmButton: FakeElement;
  cancelButton: FakeElement;
}

function createDeferred<T>(): Deferred<T> {
  let resolveDeferred: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => {
    resolveDeferred = resolve;
  });

  return {
    promise,
    resolve: resolveDeferred
  };
}

function createFakeElement(): FakeElement {
  const listeners = new Map<string, Array<(event: { target: unknown }) => void>>();
  const attributes = new Map<string, string>();
  const element: FakeElement = {
    textContent: "",
    hidden: false,
    title: "",
    append: () => {},
    addEventListener: (type, listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    click: () => {
      for (const listener of listeners.get("click") ?? []) {
        listener({ target: element });
      }
    },
    setAttribute: (name, value) => {
      attributes.set(name, value);
    },
    removeAttribute: (name) => {
      attributes.delete(name);
    },
    toggleAttribute: (name, force) => {
      const enabled = typeof force === "boolean" ? force : !attributes.has(name);
      if (enabled) {
        attributes.set(name, "");
      } else {
        attributes.delete(name);
      }
      return enabled;
    }
  };

  return element;
}

function createPasteElements(): PasteElements {
  return {
    overlay: createFakeElement(),
    dialog: createFakeElement(),
    list: createFakeElement(),
    preview: createFakeElement(),
    llmStatus: createFakeElement(),
    candidateList: createFakeElement(),
    footerNote: createFakeElement(),
    maskButton: createFakeElement(),
    llmButton: createFakeElement(),
    rawButton: createFakeElement(),
    cancelButton: createFakeElement()
  };
}

function createConfirmElements(): ConfirmElements {
  return {
    overlay: createFakeElement(),
    dialog: createFakeElement(),
    categoryList: createFakeElement(),
    preview: createFakeElement(),
    status: createFakeElement(),
    llmStatus: createFakeElement(),
    candidateList: createFakeElement(),
    submitButton: createFakeElement(),
    llmButton: createFakeElement(),
    cancelButton: createFakeElement()
  };
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function installModalMocks(readyPromise: Promise<boolean>) {
  const pasteElements = createPasteElements();
  const confirmElements = createConfirmElements();
  const cleanup = vi.fn();
  const runReviewLlm = vi.fn(async () => {});
  const isLlmBridgeModelReady = vi.fn(() => readyPromise);

  vi.doMock("../src/lib/llmBridgeClient", () => ({
    isLlmBridgeModelReady
  }));
  vi.doMock("../src/lib/reviewLlmRunner", () => ({
    runReviewLlm
  }));
  vi.doMock("../src/lib/shadowHost", () => ({
    createShadowHost: () => ({
      shadow: createFakeElement(),
      cleanup
    })
  }));
  vi.doMock("../src/lib/dialogAccessibility", () => ({
    setupDialogAccessibility: () => ({
      activate: vi.fn(),
      dispose: vi.fn()
    })
  }));
  vi.doMock("../src/lib/reviewListRenderers", () => ({
    renderReviewCandidateList: vi.fn(),
    renderReviewFindingList: vi.fn()
  }));
  vi.doMock("../src/lib/pasteReviewModalElements", () => ({
    createPasteReviewModalElements: () => pasteElements
  }));
  vi.doMock("../src/ui/confirmModalCandidateList", () => ({
    renderConfirmModalCandidateList: vi.fn()
  }));
  vi.doMock("../src/ui/confirmModalCategoryList", () => ({
    renderConfirmModalCategoryList: vi.fn()
  }));
  vi.doMock("../src/ui/confirmModalFooter", () => ({
    applyConfirmModalFooterState: vi.fn()
  }));
  vi.doMock("../src/ui/confirmModalElements", () => ({
    createConfirmModalElements: () => confirmElements
  }));

  return {
    confirmElements,
    isLlmBridgeModelReady,
    pasteElements,
    runReviewLlm
  };
}

describe("モーダルのAI文脈チェック自動実行", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("貼り付け確認を閉じた後にモデル準備済みになってもAI文脈チェックを開始しない", async () => {
    const ready = createDeferred<boolean>();
    const mocks = installModalMocks(ready.promise);
    const { showPasteReviewModal } = await import("../src/lib/modal");
    const inputText = "メールは taro@example.com です。";
    const decision = showPasteReviewModal({
      inputText,
      detection: detectSensitiveText(inputText),
      settings: {
        ...DEFAULT_SETTINGS,
        llm: {
          ...DEFAULT_SETTINGS.llm,
          mode: "auto"
        }
      }
    });

    mocks.pasteElements.cancelButton.click();
    await expect(decision).resolves.toEqual({ type: "cancel" });

    ready.resolve(true);
    await flushPromises();

    expect(mocks.isLlmBridgeModelReady).toHaveBeenCalledTimes(1);
    expect(mocks.runReviewLlm).not.toHaveBeenCalled();
  });

  it("貼り付け確認で手動実行済みなら、遅れて返った自動実行は二重起動しない", async () => {
    const ready = createDeferred<boolean>();
    const mocks = installModalMocks(ready.promise);
    const { showPasteReviewModal } = await import("../src/lib/modal");
    const inputText = "メールは taro@example.com です。";
    const decision = showPasteReviewModal({
      inputText,
      detection: detectSensitiveText(inputText),
      settings: {
        ...DEFAULT_SETTINGS,
        llm: {
          ...DEFAULT_SETTINGS.llm,
          mode: "auto"
        }
      }
    });

    mocks.pasteElements.llmButton.click();
    await flushPromises();
    ready.resolve(true);
    await flushPromises();
    mocks.pasteElements.cancelButton.click();
    await decision;

    expect(mocks.runReviewLlm).toHaveBeenCalledTimes(1);
  });

  it("送信確認を閉じた後にモデル準備済みになってもAI文脈チェックを開始しない", async () => {
    const ready = createDeferred<boolean>();
    const mocks = installModalMocks(ready.promise);
    const { showSendConfirmModal } = await import("../src/ui/confirmModal");
    const inputText = "メールは taro@example.com です。";
    const decision = showSendConfirmModal({
      inputText,
      detection: detectSensitiveText(inputText),
      llm: {
        ...DEFAULT_SETTINGS.llm,
        mode: "auto"
      }
    });

    mocks.confirmElements.cancelButton.click();
    await expect(decision).resolves.toEqual({ type: "cancel" });

    ready.resolve(true);
    await flushPromises();

    expect(mocks.isLlmBridgeModelReady).toHaveBeenCalledTimes(1);
    expect(mocks.runReviewLlm).not.toHaveBeenCalled();
  });

  it("送信確認で手動実行済みなら、遅れて返った自動実行は二重起動しない", async () => {
    const ready = createDeferred<boolean>();
    const mocks = installModalMocks(ready.promise);
    const { showSendConfirmModal } = await import("../src/ui/confirmModal");
    const inputText = "メールは taro@example.com です。";
    const decision = showSendConfirmModal({
      inputText,
      detection: detectSensitiveText(inputText),
      llm: {
        ...DEFAULT_SETTINGS.llm,
        mode: "auto"
      }
    });

    mocks.confirmElements.llmButton.click();
    await flushPromises();
    ready.resolve(true);
    await flushPromises();
    mocks.confirmElements.cancelButton.click();
    await decision;

    expect(mocks.runReviewLlm).toHaveBeenCalledTimes(1);
  });
});
