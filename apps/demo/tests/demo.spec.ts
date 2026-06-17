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
