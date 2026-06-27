import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function createQaContext({ rootDir = resolve("."), errorPrefix }) {
  function fail(message) {
    throw new Error(`${errorPrefix}: ${message}`);
  }

  function read(relativePath) {
    return readFileSync(resolve(rootDir, relativePath), "utf8");
  }

  function readJson(relativePath) {
    return JSON.parse(read(relativePath));
  }

  function assertFileExists(relativePath) {
    if (!existsSync(resolve(rootDir, relativePath))) {
      fail(`${relativePath} is missing`);
    }
  }

  function assertIncludes(text, needle, context) {
    if (!text.includes(needle)) {
      fail(`${context} must include: ${needle}`);
    }
  }

  function assertNotIncludes(text, needle, context) {
    if (text.includes(needle)) {
      fail(`${context} must not include overclaim: ${needle}`);
    }
  }

  return {
    assertFileExists,
    assertIncludes,
    assertNotIncludes,
    fail,
    read,
    readJson,
    rootDir
  };
}
