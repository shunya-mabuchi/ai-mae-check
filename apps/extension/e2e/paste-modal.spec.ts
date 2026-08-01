import { expect, test, type Locator, type Page } from "@playwright/test";
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

test.describe("貼り付け確認React Aria Modal", () => {
  test("Shadow Root内に表示し、Escape後にfocusとscrollを復元する", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await page.setViewportSize({ width: 390, height: 640 });
      await openMockComposer(page);
      const editor = page.getByTestId("textarea-editor");
      const longText = Array.from(
        { length: 14 },
        (_, index) => `担当${index + 1}: user${index + 1}@example.com / 090-1234-${String(index).padStart(4, "0")}`
      ).join("\n");

      await dispatchPaste(editor, longText);

      const host = page.locator('[data-ai-mae-check-ui="paste-review"]');
      const dialog = page.getByRole("dialog", { name: "安全化してから貼り付けますか？" });
      const safeButton = page.getByRole("button", { name: "安全化して入力" });
      await expect(host).toHaveCount(1);
      await expect(dialog).toBeVisible();
      await expect(safeButton).toBeVisible();
      await expect(safeButton).toBeFocused();

      const placement = await page.evaluate(() => {
        const modalHost = document.querySelector<HTMLElement>('[data-ai-mae-check-ui="paste-review"]');
        const overlay = modalHost?.shadowRoot?.querySelector<HTMLElement>(".hm-overlay");
        const body = modalHost?.shadowRoot?.querySelector<HTMLElement>(".hm-body");
        const footer = modalHost?.shadowRoot?.querySelector<HTMLElement>(".hm-footer");
        return {
          bodyHasOverlay: document.body.querySelector(".hm-overlay") !== null,
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
      await expect(editor).toBeFocused();
      await expect(editor).toHaveValue("");
      await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe("hidden");
    } finally {
      await closeExtensionContext(target);
    }
  });

  test("backdrop操作でキャンセルし、ホストを残さない", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await openMockComposer(page);
      const editor = page.getByTestId("textarea-editor");
      await dispatchPaste(editor, highRiskText);

      const overlay = page.locator(".hm-overlay");
      await expect(overlay).toBeVisible();
      await overlay.click({ position: { x: 4, y: 4 } });

      await expect(page.locator('[data-ai-mae-check-ui="paste-review"]')).toHaveCount(0);
      await expect(editor).toHaveValue("");
    } finally {
      await closeExtensionContext(target);
    }
  });

  test("高リスクではそのまま貼り付けを選べない", async () => {
    const target = await launchExtensionContext();
    try {
      const page = await target.context.newPage();
      await openMockComposer(page);
      await dispatchPaste(page.getByTestId("textarea-editor"), highRiskText);

      await expect(page.getByRole("button", { name: "そのまま貼り付け（不可）" })).toBeDisabled();
      await expect(page.getByText("高リスクまたは秘密情報保護の対象のため、そのまま貼り付けはできません。"))
        .toBeVisible();
    } finally {
      await closeExtensionContext(target);
    }
  });
});
