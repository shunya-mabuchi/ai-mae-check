import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("file preflight modal UI", () => {
  it("Shadow DOM用のCSSをfileModalStylesに分離して読み込む", () => {
    const stylesPath = resolve(process.cwd(), "src/ui/fileModalStyles.ts");
    const modalSource = readFileSync(resolve(process.cwd(), "src/ui/fileModal.tsx"), "utf8");
    const dialogSource = readFileSync(resolve(process.cwd(), "src/ui/FilePreflightDialog.tsx"), "utf8");

    expect(existsSync(stylesPath)).toBe(true);
    expect(modalSource).toContain('import { filePreflightModalCss } from "./fileModalStyles"');
    expect(modalSource).toContain('import { createReactShadowHost } from "../lib/shadowHost"');
    expect(modalSource).toContain("createReactShadowHost(filePreflightModalCss)");
    expect(modalSource).toContain("root.unmount()");
    expect(dialogSource).toContain('import { UNSAFE_PortalProvider } from "react-aria/PortalProvider"');
    expect(dialogSource).toContain("<ModalOverlay");
    expect(dialogSource).toContain("isOpen={isOpen}");
    expect(dialogSource).toContain("isDismissable");
    expect(dialogSource).toContain('<Dialog aria-label="ファイル添付前確認"');
    expect(dialogSource).toContain("<button autoFocus");
    expect(dialogSource).toContain('onClick={() => close("safe")}');
    expect(dialogSource).not.toContain("onPress=");
    expect(`${modalSource}\n${dialogSource}`).not.toContain("setupDialogAccessibility");
    expect(modalSource).not.toContain('document.createElement("style")');
    expect(modalSource).not.toContain("const css = `");
  });
});
