import { expect, test, type Locator, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  closeExtensionContext,
  dismissExtensionStartupPages,
  launchExtensionContext
} from "./extensionTestHarness";

const captureEnabled = process.env.CAPTURE_EXTENSION_SCREENSHOTS === "1";
const extensionRoot = fileURLToPath(new URL("..", import.meta.url));
const readmeOutputDirectory = resolve(extensionRoot, "../../docs/assets/readme");
const siteOutputPath = resolve(extensionRoot, "../site/public/extension-paste-modal.png");
const sensitiveText = [
  "田中太郎です。メールは taro@example.com、電話番号は 090-1234-5678 です。",
  "A社向けの提案資料はNDA締結前のため、関係者限りで確認してください。",
  "初期費用は300万円、月額80万円で進める予定です。"
].join("\n\n");
const contextText = [
  "A社の佐藤様向けに、Project Blue Bridge の提案メモを作成します。",
  "まだ正式発表前なので、社外共有はしない前提でお願いします。",
  "候補者の山田花子さんについて、最終面談後の評価メモも含めます。"
].join("\n\n");

async function openMockComposer(page: Page): Promise<void> {
  await dismissExtensionStartupPages(page.context(), page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/mock-composer.html");
  await expect(page.getByRole("heading", { name: "textarea composer" })).toBeVisible();
}

async function dispatchPaste(locator: Locator, text: string): Promise<void> {
  await locator.focus();
  await locator.evaluate((element, pastedText) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/plain", pastedText);
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer
      })
    );
  }, text);
}

async function saveDialog(page: Page, name: string, copyToSite = false): Promise<void> {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const image = await dialog.screenshot({ animations: "disabled" });
  await writeFile(resolve(readmeOutputDirectory, name), image);
  if (copyToSite) {
    await writeFile(siteOutputPath, image);
  }
}

test.describe("Chrome拡張の掲載画像", () => {
  test.skip(!captureEnabled, "CAPTURE_EXTENSION_SCREENSHOTS=1 のときだけ画像を更新します");

  test("貼り付け前確認を撮影する", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await openMockComposer(page);
      await dispatchPaste(page.getByTestId("textarea-editor"), sensitiveText);
      await saveDialog(page, "extension-paste-modal.png", true);
    } finally {
      await closeExtensionContext(target);
    }
  });

  test("送信前確認を撮影する", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await openMockComposer(page);
      await page.getByTestId("textarea-editor").fill(sensitiveText);
      await page.getByTestId("send-button").click();
      await saveDialog(page, "extension-send-modal.png");
    } finally {
      await closeExtensionContext(target);
    }
  });

  test("文脈チェック入口を撮影する", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await openMockComposer(page);
      await dispatchPaste(page.getByTestId("textarea-editor"), contextText);
      await expect(page.getByRole("dialog", { name: "AI文脈チェックを実行しますか？" })).toBeVisible();
      await saveDialog(page, "extension-context-modal.png");
    } finally {
      await closeExtensionContext(target);
    }
  });
});
