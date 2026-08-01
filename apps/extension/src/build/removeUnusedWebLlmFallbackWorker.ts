import { readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const FALLBACK_WORKER_FILE = /^webllmWorker-[A-Za-z0-9_-]+\.js$/;

export async function removeUnusedWebLlmFallbackWorker(
  outputDirectory: string
): Promise<string[]> {
  const assetsDirectory = resolve(outputDirectory, "assets");
  let fileNames: string[];

  try {
    fileNames = await readdir(assetsDirectory);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }
    throw error;
  }

  const fallbackWorkers = fileNames.filter((fileName) =>
    FALLBACK_WORKER_FILE.test(fileName)
  );
  await Promise.all(
    fallbackWorkers.map((fileName) =>
      rm(resolve(assetsDirectory, fileName), { force: true })
    )
  );
  return fallbackWorkers;
}
