import type { BrowserContext, Page } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = fileURLToPath(new URL(".", import.meta.url));
const extensionDir = resolve(here, "../.output-e2e/chrome-mv3");

export interface ExtensionTestContext {
  context: BrowserContext;
  userDataDir: string;
}

export async function launchExtensionContext(): Promise<ExtensionTestContext> {
  if (!existsSync(extensionDir)) {
    throw new Error("拡張E2E用buildが見つかりません。先に pnpm build:extension:e2e を実行してください。");
  }

  const userDataDir = await mkdtemp(join(tmpdir(), "ai-mae-check-extension-e2e-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: process.env.EXTENSION_E2E_HEADLESS === "1",
    args: [`--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`]
  });

  return { context, userDataDir };
}

export async function dismissExtensionStartupPages(context: BrowserContext, preservePage?: Page): Promise<void> {
  await context.waitForEvent("page", { timeout: 800 }).catch(() => null);
  await Promise.all(
    context
      .pages()
      .filter((page) => page !== preservePage && page.url().startsWith("chrome://extensions/"))
      .map((page) => page.close())
  );
}

export async function resolveExtensionId(context: BrowserContext): Promise<string> {
  const extensionPage = context.pages().find((page) => page.url().startsWith("chrome-extension://"));
  if (extensionPage) {
    return new URL(extensionPage.url()).host;
  }

  const serviceWorker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  return new URL(serviceWorker.url()).host;
}

export async function closeExtensionContext(target: ExtensionTestContext): Promise<void> {
  await target.context.close().catch(() => undefined);
  await removeUserDataDirWithRetry(target.userDataDir);
}

async function removeUserDataDirWithRetry(userDataDir: string): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      await rm(userDataDir, { recursive: true, force: true, maxRetries: 2, retryDelay: 120 });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
    }
  }

  throw lastError;
}
