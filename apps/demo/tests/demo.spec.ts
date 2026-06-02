import { expect, test } from "@playwright/test";

test("サンプル文を挿入し、ルールベース検出とマスキングを確認できる", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "デモ", exact: true }).click();
  await page.getByRole("button", { name: "サンプル文を挿入" }).click();
  await expect(page.getByPlaceholder("ここにAIへ貼る前の文章を入力してください。")).toHaveValue(/taro@example\.com/);

  await page.getByRole("button", { name: "ルールベースで検出" }).click();
  await expect(page.getByText("メールアドレス").first()).toBeVisible();
  await expect(page.getByText("[EMAIL_1]")).toBeVisible();
  await expect(page.getByText("[PHONE_1]")).toBeVisible();

  const emailFinding = page.locator("label").filter({ hasText: "メールアドレス" });
  await emailFinding.getByRole("checkbox").uncheck();
  await expect(page.locator("pre").filter({ hasText: "taro@example.com" })).toBeVisible();
  await expect(page.locator("pre").filter({ hasText: "[PHONE_1]" })).toBeVisible();
});
