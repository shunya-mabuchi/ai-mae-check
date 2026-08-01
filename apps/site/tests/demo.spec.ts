import { expect, test } from "@playwright/test";

test("サンプル文を挿入し、ルールベース検出とマスキングを確認できる", async ({ page }) => {
  await page.goto("/ai-mae-check/");

  await expect(page.getByRole("heading", { name: "貼り付け前チェックの動きを試す" })).toBeVisible();
  await expect(page.getByText("デモで確認できること")).toBeVisible();

  await page.getByRole("navigation").getByRole("link", { name: "デモ", exact: true }).click();
  await page.getByRole("button", { name: "ルール用サンプル" }).click();
  await expect(page.getByPlaceholder("ここにAIへ貼る前の文章を入力してください。")).toHaveValue(/taro@example\.com/);

  await page.getByRole("button", { name: "検出する" }).click();
  await expect(page.getByText("メールアドレス").first()).toBeVisible();
  await expect(page.getByText("[メールアドレス]")).toBeVisible();
  await expect(page.getByText("[電話番号]")).toBeVisible();

  const emailFinding = page.locator("label").filter({ hasText: "メールアドレス" });
  await emailFinding.click();
  await expect(emailFinding.getByRole("checkbox")).not.toBeChecked();
  await expect(page.locator("pre").filter({ hasText: "taro@example.com" })).toBeVisible();
  await expect(page.locator("pre").filter({ hasText: "[電話番号]" })).toBeVisible();
});

test("ミニデモをキーボードで操作し、フォーカス位置を確認できる", async ({ page }) => {
  await page.goto("/ai-mae-check/");

  const ruleSampleButton = page.getByRole("button", { name: "ルール用サンプル" });
  const contextSampleButton = page.getByRole("button", { name: "文脈用サンプル" });

  await ruleSampleButton.focus();
  await page.keyboard.press("Tab");
  await expect(contextSampleButton).toBeFocused();
  await expect(contextSampleButton).toHaveAttribute("data-focus-visible");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox", { name: "AIに貼る前の入力テキスト" })).toHaveValue(/Project Blue Bridge/);

  await ruleSampleButton.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "検出する" }).focus();
  await page.keyboard.press("Enter");

  const emailFinding = page.locator("label").filter({ hasText: "メールアドレス" });
  const emailCheckbox = emailFinding.getByRole("checkbox");
  await emailCheckbox.focus();
  await page.keyboard.press("Space");
  await expect(emailCheckbox).not.toBeChecked();
  await expect(page.locator("pre").filter({ hasText: "taro@example.com" })).toBeVisible();
});

test("プライバシーポリシーを公開URLとして直接開ける", async ({ page }) => {
  await page.goto("/ai-mae-check/privacy/");

  await expect(page.getByRole("heading", { name: "プライバシーポリシー" })).toBeVisible();
  await expect(page.getByText(/貼り付け本文やファイル本文は永続保存しません。/)).toBeVisible();
  await expect(page.getByRole("link", { name: "トップへ戻る" })).toHaveAttribute("href", "/ai-mae-check/");
});

test("公開ページのナビはカード風に浮かせずページ導線として表示する", async ({ page }) => {
  await page.goto("/ai-mae-check/privacy/");

  const publicNavigation = page.getByRole("navigation", { name: "公開ページ" });
  await expect(publicNavigation).toBeVisible();
  await expect(publicNavigation).not.toHaveClass(/bg-white/);
  await expect(publicNavigation).not.toHaveClass(/shadow-soft/);
  await expect(publicNavigation).not.toHaveClass(/rounded-card/);
  await expect(publicNavigation).not.toHaveClass(/border-line/);
});

test("公開ページのフッターはカード風に浮かせずページ下部の導線として表示する", async ({ page }) => {
  await page.goto("/ai-mae-check/privacy/");

  const footer = page.locator("footer");
  const footerShell = page.locator("footer > div");
  await expect(footer).toHaveClass(/bg-cloud/);
  await expect(footerShell).toBeVisible();
  await expect(footerShell).not.toHaveClass(/bg-white/);
  await expect(footerShell).not.toHaveClass(/shadow-soft/);
  await expect(footerShell).not.toHaveClass(/rounded-card/);
  await expect(footerShell).not.toHaveClass(/border-line/);
  await expect(footer.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/shunya-mabuchi/ai-mae-check"
  );
});

test("サポートページを公開URLとして直接開ける", async ({ page }) => {
  await page.goto("/ai-mae-check/support/");

  await expect(page.getByRole("heading", { name: "サポート" })).toBeVisible();
  await expect(page.getByText(/不具合報告や改善相談はGitHub Issuesで受け付けます。/)).toBeVisible();
  await expect(page.getByRole("link", { name: "GitHub Issuesを開く" })).toHaveAttribute(
    "href",
    "https://github.com/shunya-mabuchi/ai-mae-check/issues"
  );
});

test("プライバシーとサポートはJavaScriptなしでも読める", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/ai-mae-check/privacy/");
  await expect(page.getByRole("heading", { name: "プライバシーポリシー" })).toBeVisible();

  await page.goto("/ai-mae-check/support/");
  await expect(page.getByRole("heading", { name: "サポート" })).toBeVisible();

  await context.close();
});
