import { describe, expect, it } from "vitest";
import {
  createSafeTextContent,
  createSafeTextFileName,
  detectSensitiveText,
  getTextFilePreflightKind,
  isSupportedTextFileName
} from "../src";

describe("fileText", () => {
  it("対応テキスト拡張子を判定する", () => {
    expect(isSupportedTextFileName("notes.md")).toBe(true);
    expect(isSupportedTextFileName(".env")).toBe(true);
    expect(isSupportedTextFileName("script.ts")).toBe(true);
  });

  it("PDF/docx/xlsx/画像は対象外として判定する", () => {
    expect(getTextFilePreflightKind("paper.pdf")).toBe("unsupported_binary");
    expect(getTextFilePreflightKind("report.docx")).toBe("unsupported_binary");
    expect(getTextFilePreflightKind("sheet.xlsx")).toBe("unsupported_binary");
    expect(getTextFilePreflightKind("image.png")).toBe("unsupported_binary");
  });

  it("未知拡張子はunknownにする", () => {
    expect(getTextFilePreflightKind("archive.zip")).toBe("unknown");
  });

  it("安全版ファイル名を作る", () => {
    expect(createSafeTextFileName("secret.env")).toBe("secret.safe.env");
    expect(createSafeTextFileName(".env")).toBe(".safe.env");
  });

  it("安全版テキストでは検出範囲をマスクする", () => {
    const input = "GITHUB_TOKEN=ghp_dummyDummyDummyDummyDummyDummy123456";
    const detection = detectSensitiveText(input);

    expect(createSafeTextContent(input, detection.findings)).toContain("[ENV_SECRET_1]");
  });
});
