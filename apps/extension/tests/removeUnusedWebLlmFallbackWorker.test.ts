import { mkdtemp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { removeUnusedWebLlmFallbackWorker } from "../src/build/removeUnusedWebLlmFallbackWorker";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  );
});

describe("removeUnusedWebLlmFallbackWorker", () => {
  it("未使用fallback Workerだけを削除する", async () => {
    const outputDirectory = await mkdtemp(
      resolve(tmpdir(), "ai-mae-check-worker-")
    );
    temporaryDirectories.push(outputDirectory);
    const assetsDirectory = resolve(outputDirectory, "assets");
    await mkdir(assetsDirectory);
    await writeFile(resolve(assetsDirectory, "webllmWorker-Abc_123.js"), "fallback");
    await writeFile(resolve(assetsDirectory, "options-ui.js"), "keep");

    await expect(
      removeUnusedWebLlmFallbackWorker(outputDirectory)
    ).resolves.toEqual(["webllmWorker-Abc_123.js"]);
    await expect(readdir(assetsDirectory)).resolves.toEqual(["options-ui.js"]);
  });

  it("assetsディレクトリがなくても成功する", async () => {
    const outputDirectory = await mkdtemp(
      resolve(tmpdir(), "ai-mae-check-worker-")
    );
    temporaryDirectories.push(outputDirectory);

    await expect(
      removeUnusedWebLlmFallbackWorker(outputDirectory)
    ).resolves.toEqual([]);
  });
});
