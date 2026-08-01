import { expect, test, type Page } from "@playwright/test";
import {
  closeExtensionContext,
  dismissExtensionStartupPages,
  launchExtensionContext
} from "./extensionTestHarness";

const highRiskFile = {
  name: "secrets.env",
  mimeType: "text/plain",
  buffer: Buffer.from("AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE", "utf8")
};

async function openMockComposer(page: Page): Promise<void> {
  await dismissExtensionStartupPages(page.context(), page);
  await page.goto("/mock-composer.html");
  await expect(page.getByRole("heading", { name: "file composer" })).toBeVisible();
}

test.describe("ファイル確認React Aria Modal", () => {
  test("OverlayをShadow Root内に置き、Escape後にfocusとscrollを復元する", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await page.setViewportSize({ width: 390, height: 640 });
      await openMockComposer(page);
      const input = page.getByTestId("file-input");
      const files = Array.from({ length: 8 }, (_, index) => ({
        ...highRiskFile,
        name: `secrets-${index + 1}.env`
      }));

      await input.focus();
      await input.setInputFiles(files);

      const host = page.locator('[data-ai-mae-check-ui="file-preflight"]');
      const dialog = page.getByRole("dialog", { name: "ファイル添付前確認" });
      const safeButton = page.getByRole("button", { name: "安全版を作成して添付" });
      await expect(host).toHaveCount(1);
      await expect(dialog).toBeVisible();
      await expect(safeButton).toBeFocused();

      const placement = await page.evaluate(() => {
        const modalHost = document.querySelector<HTMLElement>('[data-ai-mae-check-ui="file-preflight"]');
        const overlay = modalHost?.shadowRoot?.querySelector<HTMLElement>(".amc-overlay");
        const scrollable = modalHost?.shadowRoot?.querySelector<HTMLElement>(".amc-dialog");
        return {
          bodyHasOverlay: document.body.querySelector(".amc-overlay") !== null,
          shadowHasOverlay: overlay !== null,
          zIndex: overlay ? getComputedStyle(overlay).zIndex : "",
          isScrollable: Boolean(scrollable && scrollable.scrollHeight > scrollable.clientHeight),
          pageOverflow: getComputedStyle(document.documentElement).overflow
        };
      });
      expect(placement).toEqual({
        bodyHasOverlay: false,
        shadowHasOverlay: true,
        zIndex: "2147483647",
        isScrollable: true,
        pageOverflow: "hidden"
      });

      await page.keyboard.press("Escape");
      await expect(host).toHaveCount(0);
      await expect(input).toBeFocused();
      await expect.poll(() => input.evaluate((element: HTMLInputElement) => element.files?.length ?? 0)).toBe(0);
      await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe("hidden");
    } finally {
      await closeExtensionContext(target);
    }
  });

  test("backdrop操作でキャンセルし、Portalとホストを残さない", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await openMockComposer(page);
      const input = page.getByTestId("file-input");
      await input.setInputFiles(highRiskFile);

      const overlay = page.locator(".amc-overlay");
      await expect(overlay).toBeVisible();
      await overlay.click({ position: { x: 4, y: 4 } });

      await expect(page.locator('[data-ai-mae-check-ui="file-preflight"]')).toHaveCount(0);
      expect(
        await page.evaluate(() => document.querySelector('[data-ai-mae-check-ui="file-preflight"]') === null)
      ).toBe(true);
    } finally {
      await closeExtensionContext(target);
    }
  });

  test("安全版を選ぶと一度だけ置換し、選択ファイルを安全化する", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await openMockComposer(page);
      const input = page.getByTestId("file-input");
      const output = page.getByTestId("file-output");
      await input.setInputFiles(highRiskFile);

      await page.getByRole("button", { name: "安全版を作成して添付" }).click();

      await expect(output).toContainText("secrets.safe.env");
      await expect(output).toHaveAttribute("data-change-count", "2");
      const selected = await input.evaluate(async (element: HTMLInputElement) => {
        const file = element.files?.[0];
        return file ? { name: file.name, text: await file.text() } : null;
      });
      expect(selected?.name).toBe("secrets.safe.env");
      expect(selected?.text).not.toContain("AKIAIOSFODNN7EXAMPLE");
      await expect(page.locator('[data-ai-mae-check-ui="file-preflight"]')).toHaveCount(0);
    } finally {
      await closeExtensionContext(target);
    }
  });

  test("中リスクは詳細確認後に元ファイルのまま添付できる", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await openMockComposer(page);
      const input = page.getByTestId("file-input");
      await input.setInputFiles({
        name: "estimate.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("月額80万円で進める予定です。", "utf8")
      });

      await page.getByRole("button", { name: "このまま添付" }).click();

      const selectedName = await input.evaluate((element: HTMLInputElement) => element.files?.[0]?.name ?? null);
      expect(selectedName).toBe("estimate.txt");
      await expect(page.locator('[data-ai-mae-check-ui="file-preflight"]')).toHaveCount(0);
    } finally {
      await closeExtensionContext(target);
    }
  });
});
