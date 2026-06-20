import { expect, test } from "@playwright/test";

test("サンプル文を挿入し、ルールベース検出とマスキングを確認できる", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "貼り付け前チェックの動きを試す" })).toBeVisible();
  await expect(page.getByText("デモで確認できること")).toBeVisible();

  await page.getByRole("navigation").getByRole("link", { name: "ミニデモ", exact: true }).click();
  await page.getByRole("button", { name: "ルール用サンプル" }).click();
  await expect(page.getByPlaceholder("ここにAIへ貼る前の文章を入力してください。")).toHaveValue(/taro@example\.com/);

  await page.getByRole("button", { name: "検出する" }).click();
  await expect(page.getByText("メールアドレス").first()).toBeVisible();
  await expect(page.getByText("[メールアドレス]")).toBeVisible();
  await expect(page.getByText("[電話番号]")).toBeVisible();

  const emailFinding = page.locator("label").filter({ hasText: "メールアドレス" });
  await emailFinding.getByRole("checkbox").uncheck();
  await expect(page.locator("pre").filter({ hasText: "taro@example.com" })).toBeVisible();
  await expect(page.locator("pre").filter({ hasText: "[電話番号]" })).toBeVisible();
});

test("プライバシーポリシーを公開URLとして直接開ける", async ({ page }) => {
  await page.goto("/privacy");

  await expect(page.getByRole("heading", { name: "プライバシーポリシー" })).toBeVisible();
  await expect(page.getByText("貼り付け本文は永続保存しません。")).toBeVisible();
  await expect(page.getByRole("link", { name: "トップへ戻る" })).toHaveAttribute("href", "/");
});

test("公開ページのナビはカード風に浮かせずページ導線として表示する", async ({ page }) => {
  await page.goto("/privacy");

  const publicNavigation = page.getByRole("navigation", { name: "公開ページ" });
  await expect(publicNavigation).toBeVisible();
  await expect(publicNavigation).not.toHaveClass(/bg-white/);
  await expect(publicNavigation).not.toHaveClass(/shadow-soft/);
  await expect(publicNavigation).not.toHaveClass(/rounded-card/);
  await expect(publicNavigation).not.toHaveClass(/border-line/);
});

test("公開ページのフッターはカード風に浮かせずページ下部の導線として表示する", async ({ page }) => {
  await page.goto("/privacy");

  const footerShell = page.locator("footer > div");
  await expect(footerShell).toBeVisible();
  await expect(footerShell).not.toHaveClass(/bg-white/);
  await expect(footerShell).not.toHaveClass(/shadow-soft/);
  await expect(footerShell).not.toHaveClass(/rounded-card/);
  await expect(footerShell).not.toHaveClass(/border-line/);
});

test("サポートページを公開URLとして直接開ける", async ({ page }) => {
  await page.goto("/support");

  await expect(page.getByRole("heading", { name: "サポート" })).toBeVisible();
  await expect(page.getByText("不具合報告や相談はGitHub Issuesで受け付けます。")).toBeVisible();
  await expect(page.getByRole("link", { name: "GitHub Issuesを開く" })).toHaveAttribute(
    "href",
    "https://github.com/shunya-mabuchi/ai-mae-check/issues"
  );
});
