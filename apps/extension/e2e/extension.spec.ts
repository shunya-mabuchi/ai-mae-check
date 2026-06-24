import { expect, test, chromium, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const extensionDir = resolve(here, "../.output-e2e/chrome-mv3");
const sensitiveText = "田中太郎です。メールは taro@example.com、電話番号は 090-1234-5678 です。";

interface ExtensionTestContext {
  context: BrowserContext;
  userDataDir: string;
}

async function launchExtensionContext(): Promise<ExtensionTestContext> {
  if (!existsSync(extensionDir)) {
    throw new Error("拡張E2E用buildが見つかりません。先に pnpm build:extension:e2e を実行してください。");
  }

  const userDataDir = await mkdtemp(join(tmpdir(), "ai-mae-check-extension-e2e-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: process.env.EXTENSION_E2E_HEADLESS === "1",
    args: [`--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`]
  });

  return { context, userDataDir };
}

async function closeExtensionContext(target: ExtensionTestContext): Promise<void> {
  await target.context.close();
  await rm(target.userDataDir, { recursive: true, force: true });
}

async function openMockComposer(page: Page): Promise<void> {
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

test.describe("AIまえチェック拡張E2E", () => {
  test("textareaへのpasteを検知し、安全化して貼り付けられる", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await openMockComposer(page);

      const editor = page.getByTestId("textarea-editor");
      await dispatchPaste(editor, sensitiveText);

      await expect(page.getByText("安全化してから貼り付けますか？")).toBeVisible();
      await page.getByRole("button", { name: "安全化して入力" }).click();

      await expect(editor).toHaveValue(/田中太郎/);
      await expect(editor).toHaveValue(/\[メールアドレス\]/);
      await expect(editor).toHaveValue(/\[電話番号\]/);
      await expect(editor).not.toHaveValue(/taro@example\.com/);
      await expect(editor).not.toHaveValue(/090-1234-5678/);
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

      await expect(page.getByText("安全化してから貼り付けますか？")).toBeVisible();
      await page.getByRole("button", { name: "安全化して入力" }).click();

      await expect(editor).toContainText("田中太郎");
      await expect(editor).toContainText("[メールアドレス]");
      await expect(editor).toContainText("[電話番号]");
      await expect(editor).not.toContainText("taro@example.com");
      await expect(editor).not.toContainText("090-1234-5678");
    } finally {
      await closeExtensionContext(target);
    }
  });

  test("送信ボタンclickを送信前確認で止め、安全化してから送信できる", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await openMockComposer(page);

      const editor = page.getByTestId("textarea-editor");
      const output = page.getByTestId("submitted-output");
      await editor.fill(sensitiveText);

      await page.getByTestId("send-button").click();
      await expect(page.getByText("送信前に安全化しますか？")).toBeVisible();
      await expect(output).toHaveAttribute("data-submitted", "false");

      await page.getByRole("button", { name: "安全化して送信" }).click();

      await expect(output).toHaveAttribute("data-submitted", "true");
      await expect(output).toContainText("[メールアドレス]");
      await expect(output).toContainText("[電話番号]");
      await expect(output).not.toContainText("taro@example.com");
      await expect(output).not.toContainText("090-1234-5678");
    } finally {
      await closeExtensionContext(target);
    }
  });
});
