import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  closeExtensionContext,
  dismissExtensionStartupPages,
  launchExtensionContext
} from "./extensionTestHarness";
const sensitiveText = "田中太郎です。メールは taro@example.com、電話番号は 090-1234-5678 です。";
const mediumRiskText = "来月の契約更新に向けて、月額80万円で進める予定です。";
const expectedPasteActionLabel = "安全化して入力";
const expectedSendActionLabel = "安全化して送信";

async function openMockComposer(page: Page): Promise<void> {
  await dismissExtensionStartupPages(page.context(), page);
  await page.goto("/mock-composer.html");
  await expect(page.getByRole("heading", { name: "textarea composer" })).toBeVisible();
}

async function dispatchPaste(locator: Locator, text: string): Promise<void> {
  await locator.focus();
  await locator.evaluate((element, pastedText) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/plain", pastedText);
    const event = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: dataTransfer
    });

    if (!event.clipboardData) {
      Object.defineProperty(event, "clipboardData", { value: dataTransfer });
    }

    element.dispatchEvent(event);
  }, text);
}

async function dispatchEnter(locator: Locator, init: KeyboardEventInit = {}): Promise<void> {
  await locator.focus();
  await locator.evaluate((element, eventInit) => {
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
      ...eventInit
    });
    element.dispatchEvent(event);
  }, init);
}

async function clickPasteSafeInput(page: Page): Promise<void> {
  await expect(page.locator(".hm-dialog")).toBeVisible();
  expect(expectedPasteActionLabel).toBe("安全化して入力");
  await page.locator(".hm-dialog .hm-primary").click();
}

async function clickSendSafeSubmit(page: Page): Promise<void> {
  await expect(page.locator(".amc-dialog")).toBeVisible();
  expect(expectedSendActionLabel).toBe("安全化して送信");
  await page.locator(".amc-dialog .amc-primary").click();
}

async function expectNoSend(page: Page): Promise<void> {
  await expect(page.getByTestId("submitted-output")).toHaveAttribute("data-submitted", "false");
}

async function expectTextareaIsSanitized(editor: Locator): Promise<void> {
  await expect(editor).toHaveValue(/田中太郎/);
  await expect(editor).toHaveValue(/\[メールアドレス\]/);
  await expect(editor).toHaveValue(/\[電話番号\]/);
  await expect(editor).not.toHaveValue(/taro@example\.com/);
  await expect(editor).not.toHaveValue(/090-1234-5678/);
}

async function expectEditableIsSanitized(editor: Locator): Promise<void> {
  await expect(editor).toContainText("田中太郎");
  await expect(editor).toContainText("[メールアドレス]");
  await expect(editor).toContainText("[電話番号]");
  await expect(editor).not.toContainText("taro@example.com");
  await expect(editor).not.toContainText("090-1234-5678");
}

async function fillEditor(editor: Locator, text: string): Promise<void> {
  const tagName = await editor.evaluate((element) => element.tagName.toLowerCase());
  if (tagName === "textarea" || tagName === "input") {
    await editor.fill(text);
    return;
  }

  await editor.evaluate((element, value) => {
    element.textContent = value;
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
  }, text);
}

test.describe("AIまえチェック拡張E2E", () => {
  test("textareaへのpasteを検知し、安全化して貼り付けられる", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await openMockComposer(page);

      const editor = page.getByTestId("textarea-editor");
      await dispatchPaste(editor, sensitiveText);
      await clickPasteSafeInput(page);

      await expectTextareaIsSanitized(editor);
    } finally {
      await closeExtensionContext(target);
    }
  });

  test("contenteditableへのpasteを検知し、安全化して貼り付けられる", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await openMockComposer(page);

      const editor = page.getByTestId("contenteditable-editor");
      await dispatchPaste(editor, sensitiveText);
      await clickPasteSafeInput(page);

      await expectEditableIsSanitized(editor);
    } finally {
      await closeExtensionContext(target);
    }
  });

  test("Lexical風DOMへのpasteを検知し、安全化して貼り付けられる", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await openMockComposer(page);

      const editor = page.getByTestId("lexical-editor");
      await dispatchPaste(editor, sensitiveText);
      await clickPasteSafeInput(page);

      await expectEditableIsSanitized(editor);
    } finally {
      await closeExtensionContext(target);
    }
  });

  test("ProseMirror風DOMへのpasteを検知し、安全化して貼り付けられる", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await openMockComposer(page);

      const editor = page.getByTestId("prosemirror-editor");
      await dispatchPaste(editor, sensitiveText);
      await clickPasteSafeInput(page);

      await expectEditableIsSanitized(editor);
    } finally {
      await closeExtensionContext(target);
    }
  });

  test("貼り付け確認をキャンセルすると入力欄へ反映しない", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await openMockComposer(page);

      const editor = page.getByTestId("textarea-editor");
      await dispatchPaste(editor, sensitiveText);
      await expect(page.locator(".hm-dialog")).toBeVisible();
      await page.locator(".hm-dialog .hm-ghost").click();

      await expect(page.locator(".hm-dialog")).toHaveCount(0);
      await expect(editor).toHaveValue("");
    } finally {
      await closeExtensionContext(target);
    }
  });

  test("送信ボタンクリックを送信前確認で止め、安全化してから送信できる", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await openMockComposer(page);

      const editor = page.getByTestId("textarea-editor");
      const output = page.getByTestId("submitted-output");
      await editor.fill(sensitiveText);

      await page.getByTestId("send-button").click();
      await expect(output).toHaveAttribute("data-submitted", "false");

      await clickSendSafeSubmit(page);

      await expect(output).toHaveAttribute("data-submitted", "true");
      await expect(output).toContainText("[メールアドレス]");
      await expect(output).toContainText("[電話番号]");
      await expect(output).not.toContainText("taro@example.com");
      await expect(output).not.toContainText("090-1234-5678");
    } finally {
      await closeExtensionContext(target);
    }
  });

  test("mediumリスクだけなら詳細確認後にそのまま送信できる", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await openMockComposer(page);

      const editor = page.getByTestId("textarea-editor");
      const output = page.getByTestId("submitted-output");
      await editor.fill(mediumRiskText);

      await page.getByTestId("send-button").click();
      await expectNoSend(page);
      await expect(page.locator(".amc-dialog")).toBeVisible();
      await expect(page.locator(".amc-dialog .amc-primary")).toHaveText("安全化して送信");

      const category = page.locator(".amc-category").filter({ hasText: "金額・金融情報" });
      await category.locator("summary").click();
      await expect(category).toContainText("80万円");
      await category.locator("input[type='checkbox']").uncheck();
      await expect(page.locator(".amc-dialog .amc-primary")).toHaveText("そのまま送信");
      await page.locator(".amc-dialog .amc-primary").click();

      await expect(output).toHaveAttribute("data-submitted", "true");
      await expect(output).toContainText("月額80万円");
      await expect(output).not.toContainText("[金額・金融情報]");
    } finally {
      await closeExtensionContext(target);
    }
  });

  test("highリスクはそのまま送信へ切り替えられない", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await openMockComposer(page);

      const editor = page.getByTestId("textarea-editor");
      await editor.fill(sensitiveText);

      await page.getByTestId("send-button").click();
      await expectNoSend(page);
      await expect(page.locator(".amc-dialog")).toBeVisible();
      await expect(page.locator(".amc-dialog .amc-primary")).toHaveText("安全化して送信");
      await expect(page.locator(".amc-dialog")).not.toContainText("そのまま送信");

      const lockedCheckboxes = page.locator(".amc-category input[type='checkbox']");
      await expect(lockedCheckboxes.first()).toBeDisabled();
      await clickSendSafeSubmit(page);

      await expectTextareaIsSanitized(editor);
      await expect(page.getByTestId("submitted-output")).toHaveAttribute("data-submitted", "true");
    } finally {
      await closeExtensionContext(target);
    }
  });

  test("通常EnterとCtrl/Meta+Enterの送信前確認を検知する", async () => {
    for (const [name, init] of [
      ["通常Enter", {}],
      ["Ctrl+Enter", { ctrlKey: true }],
      ["Meta+Enter", { metaKey: true }]
    ] satisfies Array<[string, KeyboardEventInit]>) {
      const target = await launchExtensionContext();
      try {
        const page = await target.context.newPage();
        await openMockComposer(page);

        const editor = page.getByTestId("textarea-editor");
        const output = page.getByTestId("submitted-output");
        await editor.fill(`${sensitiveText}\n${name}`);

        await dispatchEnter(editor, init);
        await expect(output).toHaveAttribute("data-submitted", "false");
        await clickSendSafeSubmit(page);

        await expect(output).toHaveAttribute("data-submitted", "true");
        await expect(output).toContainText("[メールアドレス]");
        await expect(output).not.toContainText("taro@example.com");
      } finally {
        await closeExtensionContext(target);
      }
    }
  });

  test("Shift/Alt/IME変換中のEnterは送信扱いにしない", async () => {
    for (const [name, init] of [
      ["Shift+Enter", { shiftKey: true }],
      ["Alt+Enter", { altKey: true }],
      ["IME変換中Enter", { isComposing: true }]
    ] satisfies Array<[string, KeyboardEventInit]>) {
      const target = await launchExtensionContext();
      try {
        const page = await target.context.newPage();
        await openMockComposer(page);

        const editor = page.getByTestId("textarea-editor");
        const output = page.getByTestId("submitted-output");
        await fillEditor(editor, `${sensitiveText}\n${name}`);

        await dispatchEnter(editor, init);

        await expect(page.locator(".amc-dialog")).toHaveCount(0, { timeout: 500 });
        await expect(output).toHaveAttribute("data-submitted", "false");
      } finally {
        await closeExtensionContext(target);
      }
    }
  });
});
