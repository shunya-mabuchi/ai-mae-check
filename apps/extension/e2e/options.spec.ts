import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  closeExtensionContext,
  dismissExtensionStartupPages,
  launchExtensionContext,
  resolveExtensionId
} from "./extensionTestHarness";

async function openOptionsPage(context: BrowserContext): Promise<Page> {
  const extensionId = await resolveExtensionId(context);
  const optionsUrl = `chrome-extension://${extensionId}/options.html`;
  const existingPage = context.pages().find((candidate) => candidate.url() === optionsUrl);

  if (existingPage) {
    await expect(existingPage.getByRole("heading", { name: "設定", level: 1 })).toBeVisible();
    await expect(existingPage.getByText("設定は変更時に自動保存されます。", { exact: true })).toBeVisible();
    return existingPage;
  }

  // 初回インストール時の自動Options表示が完了してから、検証用タブを開きます。
  const page = await context.newPage();
  await dismissExtensionStartupPages(context, page);
  await page.goto(optionsUrl);

  await expect(page.getByRole("heading", { name: "設定", level: 1 })).toBeVisible();
  await expect(page.getByText("設定は変更時に自動保存されます。", { exact: true })).toBeVisible();
  return page;
}

test.describe("Options PageのReact Aria操作", () => {
  test("チェックボックスをSpaceで変更し、再読み込み後も保持する", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await openOptionsPage(target.context);
      const checkbox = page.getByRole("checkbox", { name: "AIまえチェックを有効にする" });

      await expect(checkbox).toBeChecked();
      await checkbox.focus();
      await page.keyboard.press("Space");
      await expect(checkbox).not.toBeChecked();
      await expect(page.getByText("保存しました。", { exact: true })).toBeVisible();

      await page.reload();
      await expect(page.getByText("設定は変更時に自動保存されます。", { exact: true })).toBeVisible();
      await expect(page.getByRole("checkbox", { name: "AIまえチェックを有効にする" })).not.toBeChecked();
    } finally {
      await closeExtensionContext(target);
    }
  });

  test("実行方法を矢印キーで変更し、再読み込み後も保持する", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await openOptionsPage(target.context);
      const manualRadio = page.getByRole("radio", { name: /手動ボタンだけで実行/ });
      const autoRadio = page.getByRole("radio", { name: /準備済みなら自動実行/ });

      await expect(manualRadio).toBeChecked();
      await manualRadio.focus();
      await page.keyboard.press("ArrowRight");
      await expect(autoRadio).toBeChecked();
      await expect(page.getByText("保存しました。", { exact: true })).toBeVisible();

      await page.reload();
      await expect(page.getByText("設定は変更時に自動保存されます。", { exact: true })).toBeVisible();
      await expect(page.getByRole("radio", { name: /準備済みなら自動実行/ })).toBeChecked();
    } finally {
      await closeExtensionContext(target);
    }
  });

  test("実行負荷を低負荷へ変更し、軽量モデル選択を保持する", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await openOptionsPage(target.context);
      const standardRadio = page.getByRole("radio", { name: /^標準/ });
      const lowResourceRadio = page.getByRole("radio", { name: /^低負荷/ });

      await expect(standardRadio).toBeChecked();
      await standardRadio.focus();
      await page.keyboard.press("ArrowRight");
      await expect(lowResourceRadio).toBeChecked();
      await expect(page.getByText("Qwen2.5-0.5B-Instruct-q4f16_1-MLC", { exact: true })).toBeVisible();
      await expect(page.getByText("保存しました。", { exact: true })).toBeVisible();

      await page.reload();
      await expect(page.getByText("設定は変更時に自動保存されます。", { exact: true })).toBeVisible();
      await expect(page.getByRole("radio", { name: /^低負荷/ })).toBeChecked();
      await expect(page.getByText("Qwen2.5-0.5B-Instruct-q4f16_1-MLC", { exact: true })).toBeVisible();
    } finally {
      await closeExtensionContext(target);
    }
  });

  test("React AriaボタンをEnterで実行できる", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await openOptionsPage(target.context);
      const createButton = page.getByRole("button", { name: "診断情報を作成" });

      await createButton.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("textbox", { name: "本文を含まない診断情報" })).toBeVisible();
      await expect(page.getByText("本文を含まない診断情報を作成しました。内容を確認してからコピーできます。", { exact: true })).toBeVisible();
    } finally {
      await closeExtensionContext(target);
    }
  });
});
