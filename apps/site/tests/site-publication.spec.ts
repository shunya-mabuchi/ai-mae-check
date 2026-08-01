import { expect, test } from "@playwright/test";

test("公開ページのメタデータと主要画像を読み込める", async ({ page }) => {
  await page.goto("/ai-mae-check/");

  await expect(page).toHaveTitle("AIまえチェック | AIに送る前に、消し忘れを見つける。");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://shunya-mabuchi.github.io/ai-mae-check/"
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://shunya-mabuchi.github.io/ai-mae-check/ogp.png"
  );
  await expect(page.locator('link[rel="icon"][sizes="32x32"]')).toHaveAttribute(
    "href",
    "/ai-mae-check/favicon-32.png"
  );

  const extensionImage = page.getByRole("img", {
    name: "ChatGPTで貼り付け前に表示されるAIまえチェックの確認画面"
  });
  await expect(extensionImage).toBeVisible();
  await expect
    .poll(() => extensionImage.evaluate((image) => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
});

test("JavaScriptなしでプライバシー・サポート・404を直接読める", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/ai-mae-check/privacy/");
  await expect(page.getByRole("heading", { name: "プライバシーポリシー" })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://shunya-mabuchi.github.io/ai-mae-check/privacy/"
  );

  await page.goto("/ai-mae-check/support/");
  await expect(page.getByRole("heading", { name: "サポート" })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://shunya-mabuchi.github.io/ai-mae-check/support/"
  );

  await page.goto("/ai-mae-check/404.html");
  await expect(page.getByRole("heading", { name: "ページが見つかりません" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  await expect(page.getByRole("link", { name: "トップへ戻る" })).toHaveAttribute("href", "/ai-mae-check/");

  await context.close();
});
