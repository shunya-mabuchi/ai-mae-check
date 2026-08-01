import { expect, test, type Page } from "@playwright/test";
import {
  closeExtensionContext,
  dismissExtensionStartupPages,
  launchExtensionContext
} from "./extensionTestHarness";

const highRiskText = "田中太郎です。メールは taro@example.com、電話番号は 090-1234-5678 です。";

async function openMockComposer(page: Page): Promise<void> {
  await dismissExtensionStartupPages(page.context(), page);
  await page.goto("/mock-composer.html");
  await expect(page.getByRole("heading", { name: "textarea composer" })).toBeVisible();
}

test.describe("送信前確認React Aria Modal", () => {
  test("Shadow Root内に表示し、Escape後にfocusとscrollを復元する", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await page.setViewportSize({ width: 390, height: 640 });
      await openMockComposer(page);
      const editor = page.getByTestId("textarea-editor");
      const sendButton = page.getByTestId("send-button");
      const longText = Array.from(
        { length: 14 },
        (_, index) => `担当${index + 1}: user${index + 1}@example.com / 090-1234-${String(index).padStart(4, "0")}`
      ).join("\n");
      await editor.fill(longText);

      await sendButton.click();

      const host = page.locator('[data-ai-mae-check-ui="send-confirm"]');
      const dialog = page.getByRole("dialog", { name: "送信前に安全化しますか？" });
      const safeButton = page.getByRole("button", { name: "安全化して送信" });
      await expect(host).toHaveCount(1);
      await expect(dialog).toBeVisible();
      await expect(safeButton).toBeVisible();
      await expect(safeButton).toBeFocused();
      await page.keyboard.press("Tab");
      await expect.poll(() => page.evaluate(() => {
        const modalHost = document.querySelector<HTMLElement>('[data-ai-mae-check-ui="send-confirm"]');
        return Boolean(modalHost?.shadowRoot?.activeElement);
      })).toBe(true);
      await page.keyboard.press("Shift+Tab");
      await expect.poll(() => page.evaluate(() => {
        const modalHost = document.querySelector<HTMLElement>('[data-ai-mae-check-ui="send-confirm"]');
        return Boolean(modalHost?.shadowRoot?.activeElement);
      })).toBe(true);

      const placement = await page.evaluate(() => {
        const modalHost = document.querySelector<HTMLElement>('[data-ai-mae-check-ui="send-confirm"]');
        const overlay = modalHost?.shadowRoot?.querySelector<HTMLElement>(".amc-overlay");
        const body = modalHost?.shadowRoot?.querySelector<HTMLElement>(".amc-body");
        const footer = modalHost?.shadowRoot?.querySelector<HTMLElement>(".amc-footer");
        return {
          bodyHasOverlay: document.body.querySelector(".amc-overlay") !== null,
          shadowHasOverlay: overlay !== null,
          bodyScrollable: Boolean(body && body.scrollHeight > body.clientHeight),
          footerBottom: footer?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY,
          pageOverflow: getComputedStyle(document.documentElement).overflow
        };
      });
      expect(placement.bodyHasOverlay).toBe(false);
      expect(placement.shadowHasOverlay).toBe(true);
      expect(placement.bodyScrollable).toBe(true);
      expect(placement.footerBottom).toBeLessThanOrEqual(640);
      expect(placement.pageOverflow).toBe("hidden");

      await page.keyboard.press("Escape");
      await expect(host).toHaveCount(0);
      await expect(sendButton).toBeFocused();
      await expect(page.getByTestId("submitted-output")).toHaveAttribute("data-submitted", "false");
      await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe("hidden");
    } finally {
      await closeExtensionContext(target);
    }
  });

  test("backdrop操作でキャンセルし、送信しない", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await openMockComposer(page);
      await page.getByTestId("textarea-editor").fill(highRiskText);
      await page.getByTestId("send-button").click();

      const overlay = page.locator(".amc-overlay");
      await expect(overlay).toBeVisible();
      await overlay.click({ position: { x: 4, y: 4 } });

      await expect(page.locator('[data-ai-mae-check-ui="send-confirm"]')).toHaveCount(0);
      await expect(page.getByTestId("submitted-output")).toHaveAttribute("data-submitted", "false");
    } finally {
      await closeExtensionContext(target);
    }
  });

  test("同じカテゴリの高リスクと中リスクは必須項目だけを固定する", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await openMockComposer(page);
      const inputText = "カード番号は 4111 1111 1111 1111、予算は300万円です。";
      await page.getByTestId("textarea-editor").fill(inputText);
      await page.getByTestId("send-button").click();

      const requiredFinancial = page.getByRole("checkbox", {
        name: "金額・金融情報 危険度: 高 1"
      });
      const optionalFinancial = page.getByRole("checkbox", {
        name: "金額・金融情報 危険度: 中 1"
      });
      await expect(requiredFinancial).toBeDisabled();
      await expect(optionalFinancial).toBeEnabled();
      await optionalFinancial.uncheck();
      await page.getByRole("button", { name: "安全化して送信" }).click();

      const output = page.getByTestId("submitted-output");
      await expect(output).toHaveAttribute("data-submitted", "true");
      await expect(output).toContainText("300万円");
      await expect(output).not.toContainText("4111 1111 1111 1111");
    } finally {
      await closeExtensionContext(target);
    }
  });
});
