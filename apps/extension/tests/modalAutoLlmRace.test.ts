import { afterEach, describe, expect, it, vi } from "vitest";
import { detectSensitiveText } from "@ai-mae-check/core";
import { DEFAULT_SETTINGS } from "../src/lib/settings";
import type { PasteReviewDialogElements } from "../src/lib/pasteReviewModalTypes";
import type { SendConfirmDialogElements } from "../src/ui/confirmModalTypes";

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
  removeEventListener: (type: string, listener: (event: { target: unknown }) => void) => void;
  click: () => void;
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
  toggleAttribute: (name: string, force?: boolean) => boolean;
}

interface PasteElements {
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
    removeEventListener: (type, listener) => {
      listeners.set(type, (listeners.get(type) ?? []).filter((item) => item !== listener));
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

async function launchPasteController(
  pasteElements: PasteElements,
  inputText: string,
  settings = DEFAULT_SETTINGS
) {
  const { initializePasteReviewModalController } = await import(
    "../src/lib/pasteReviewModalController"
  );
  const decisions: unknown[] = [];
  let closed = false;
  let controller: { dispose: () => void } | undefined;
  controller = initializePasteReviewModalController({
    inputText,
    detection: detectSensitiveText(inputText),
    settings,
    elements: pasteElements as unknown as PasteReviewDialogElements,
    close: (decision) => {
      decisions.push(decision);
      closed = true;
      controller?.dispose();
    },
    isClosed: () => closed
  });

  return { decisions };
}

async function launchSendController(
  confirmElements: ConfirmElements,
  inputText: string,
  llm = DEFAULT_SETTINGS.llm
) {
  const { initializeSendConfirmModalController } = await import(
    "../src/ui/confirmModalController"
  );
  const decisions: unknown[] = [];
  let closed = false;
  let controller: { dispose: () => void } | undefined;
  controller = initializeSendConfirmModalController({
    inputText,
    detection: detectSensitiveText(inputText),
    llm,
    elements: confirmElements as unknown as SendConfirmDialogElements,
    close: (decision) => {
      decisions.push(decision);
      closed = true;
      controller?.dispose();
    },
    isClosed: () => closed
  });

  return { decisions };
}

function installModalMocks(readyPromise: Promise<boolean>) {
  const pasteElements = createPasteElements();
  const confirmElements = createConfirmElements();
  const runReviewLlm = vi.fn(async () => {});
  const isLlmBridgeModelReady = vi.fn(() => readyPromise);
  const renderReviewCandidateList = vi.fn();
  const renderReviewFindingList = vi.fn();
  const renderConfirmModalCandidateList = vi.fn();

  vi.doMock("../src/lib/llmBridgeClient", () => ({
    isLlmBridgeModelReady
  }));
  vi.doMock("../src/lib/reviewLlmRunner", () => ({
    runReviewLlm
  }));
  vi.doMock("../src/lib/reviewListRenderers", () => ({
    renderReviewCandidateList,
    renderReviewFindingList
  }));
  vi.doMock("../src/ui/confirmModalCandidateList", () => ({
    renderConfirmModalCandidateList
  }));
  vi.doMock("../src/ui/confirmModalCategoryList", () => ({
    renderConfirmModalCategoryList: vi.fn()
  }));
  vi.doMock("../src/ui/confirmModalFooter", () => ({
    applyConfirmModalFooterState: vi.fn()
  }));
  return {
    confirmElements,
    isLlmBridgeModelReady,
    pasteElements,
    renderConfirmModalCandidateList,
    renderReviewCandidateList,
    renderReviewFindingList,
    runReviewLlm
  };
}

describe("モーダルのAI文脈チェック自動実行", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("貼り付け確認の自動モードではモデル準備を含めて直ちにAI文脈チェックを開始する", async () => {
    const mocks = installModalMocks(Promise.resolve(false));
    const inputText = "メールは taro@example.com です。";
    await launchPasteController(mocks.pasteElements, inputText, {
        ...DEFAULT_SETTINGS,
        llm: {
          ...DEFAULT_SETTINGS.llm,
          mode: "auto"
        }
    });

    await flushPromises();
    mocks.pasteElements.cancelButton.click();

    expect(mocks.runReviewLlm).toHaveBeenCalledTimes(1);
  });

  it("貼り付け確認の初期表示ではAI候補なしメッセージを出さない", async () => {
    const ready = createDeferred<boolean>();
    const mocks = installModalMocks(ready.promise);
    const inputText = "メールは taro@example.com です。";
    await launchPasteController(mocks.pasteElements, inputText);

    await flushPromises();
    mocks.pasteElements.cancelButton.click();

    expect(mocks.renderReviewCandidateList).toHaveBeenCalledWith(
      mocks.pasteElements.candidateList,
      [],
      expect.any(Set),
      expect.any(Function),
      { showEmptyMessage: false }
    );
  });

  it("貼り付け確認のAI文脈チェック完了後に候補0件なら空メッセージを出せる", async () => {
    const ready = createDeferred<boolean>();
    const mocks = installModalMocks(ready.promise);
    mocks.runReviewLlm.mockImplementationOnce(async (options) => {
      options.setCandidates([]);
      options.setEmptyCandidateMessageVisible?.(true);
      options.render();
    });
    const inputText = "メールは taro@example.com です。";
    await launchPasteController(mocks.pasteElements, inputText);

    mocks.pasteElements.llmButton.click();
    await flushPromises();
    mocks.pasteElements.cancelButton.click();

    expect(mocks.renderReviewCandidateList).toHaveBeenLastCalledWith(
      mocks.pasteElements.candidateList,
      [],
      expect.any(Set),
      expect.any(Function),
      { showEmptyMessage: true }
    );
  });

  it("貼り付け確認を閉じた後に遅れて返ったAI候補を再描画しない", async () => {
    const ready = createDeferred<boolean>();
    const analysis = createDeferred<void>();
    const mocks = installModalMocks(ready.promise);
    mocks.runReviewLlm.mockImplementationOnce(async (options) => {
      await analysis.promise;
      options.setCandidates([]);
      options.setEmptyCandidateMessageVisible?.(true);
      options.render();
    });
    const inputText = "メールは taro@example.com です。";
    await launchPasteController(mocks.pasteElements, inputText);
    const renderCountBeforeExecution = mocks.renderReviewCandidateList.mock.calls.length;

    mocks.pasteElements.llmButton.click();
    mocks.pasteElements.cancelButton.click();
    analysis.resolve();
    await flushPromises();

    expect(mocks.renderReviewCandidateList).toHaveBeenCalledTimes(renderCountBeforeExecution);
  });

  it("送信確認の自動モードではモデル準備を含めて直ちにAI文脈チェックを開始する", async () => {
    const mocks = installModalMocks(Promise.resolve(false));
    const inputText = "メールは taro@example.com です。";
    await launchSendController(mocks.confirmElements, inputText, {
        ...DEFAULT_SETTINGS.llm,
        mode: "auto"
    });

    await flushPromises();
    mocks.confirmElements.cancelButton.click();

    expect(mocks.runReviewLlm).toHaveBeenCalledTimes(1);
  });

  it("送信確認の初期表示ではAI候補なしメッセージを出さない", async () => {
    const ready = createDeferred<boolean>();
    const mocks = installModalMocks(ready.promise);
    const inputText = "メールは taro@example.com です。";
    await launchSendController(mocks.confirmElements, inputText);

    await flushPromises();
    mocks.confirmElements.cancelButton.click();

    expect(mocks.renderConfirmModalCandidateList).toHaveBeenCalledWith(
      mocks.confirmElements.candidateList,
      [],
      expect.any(Set),
      expect.any(Function),
      { showEmptyMessage: false }
    );
  });

  it("送信確認のAI文脈チェック完了後に候補0件なら空メッセージを出せる", async () => {
    const ready = createDeferred<boolean>();
    const mocks = installModalMocks(ready.promise);
    mocks.runReviewLlm.mockImplementationOnce(async (options) => {
      options.setCandidates([]);
      options.setEmptyCandidateMessageVisible?.(true);
      options.render();
    });
    const inputText = "メールは taro@example.com です。";
    await launchSendController(mocks.confirmElements, inputText);

    mocks.confirmElements.llmButton.click();
    await flushPromises();
    mocks.confirmElements.cancelButton.click();

    expect(mocks.renderConfirmModalCandidateList).toHaveBeenLastCalledWith(
      mocks.confirmElements.candidateList,
      [],
      expect.any(Set),
      expect.any(Function),
      { showEmptyMessage: true }
    );
  });

  it("送信確認を閉じた後に遅れて返ったAI候補を再描画しない", async () => {
    const ready = createDeferred<boolean>();
    const analysis = createDeferred<void>();
    const mocks = installModalMocks(ready.promise);
    mocks.runReviewLlm.mockImplementationOnce(async (options) => {
      await analysis.promise;
      options.setCandidates([]);
      options.setEmptyCandidateMessageVisible?.(true);
      options.render();
    });
    const inputText = "メールは taro@example.com です。";
    await launchSendController(mocks.confirmElements, inputText);
    const renderCountBeforeExecution = mocks.renderConfirmModalCandidateList.mock.calls.length;

    mocks.confirmElements.llmButton.click();
    mocks.confirmElements.cancelButton.click();
    analysis.resolve();
    await flushPromises();

    expect(mocks.renderConfirmModalCandidateList).toHaveBeenCalledTimes(renderCountBeforeExecution);
  });
});
