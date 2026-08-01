import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const captureEnabled = process.env.CAPTURE_SITE_SCREENSHOTS === "1";
const siteRoot = fileURLToPath(new URL("..", import.meta.url));
const outputDirectory = resolve(siteRoot, "../../docs/assets/portfolio");

test.describe("公開サイトの掲載画像", () => {
  test.skip(!captureEnabled, "CAPTURE_SITE_SCREENSHOTS=1 のときだけ画像を更新します");

  for (const viewport of [
    { name: "1440", width: 1440, height: 900 },
    { name: "390", width: 390, height: 844 }
  ]) {
    test(`${viewport.name}pxの公開サイトを撮影する`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/ai-mae-check/");
      await page.getByRole("button", { name: "ルール用サンプル" }).click();
      await page.getByRole("button", { name: "検出する" }).click();
      await expect(page.getByText("メールアドレス").first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: resolve(outputDirectory, `site-${viewport.name}.png`),
        fullPage: true,
        animations: "disabled"
      });
    });
  }
});
