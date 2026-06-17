import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("file preflight modal UI", () => {
  it("Shadow DOM用のCSSをfileModalStylesに分離して読み込む", () => {
    const stylesPath = resolve(process.cwd(), "src/ui/fileModalStyles.ts");
    const modalSource = readFileSync(resolve(process.cwd(), "src/ui/fileModal.ts"), "utf8");

    expect(existsSync(stylesPath)).toBe(true);
    expect(modalSource).toContain('import { filePreflightModalCss } from "./fileModalStyles"');
    expect(modalSource).toContain('import { createShadowHost } from "../lib/shadowHost"');
    expect(modalSource).toContain("createShadowHost(filePreflightModalCss)");
    expect(modalSource).not.toContain('document.createElement("style")');
    expect(modalSource).not.toContain("const css = `");
  });
});
