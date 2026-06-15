import { describe, expect, it } from "vitest";
import { describeFileForPreflight } from "../src/content/dom/fileInterceptor";

describe("fileInterceptor", () => {
  it("対応テキストファイルを検査対象にする", () => {
    const result = describeFileForPreflight({ name: "secrets.env", type: "text/plain", size: 120 });

    expect(result.kind).toBe("supported_text");
    expect(result.inspectable).toBe(true);
  });

  it("PDFや画像は対象外として扱う", () => {
    expect(describeFileForPreflight({ name: "paper.pdf", type: "application/pdf", size: 1000 }).kind).toBe("unsupported_binary");
    expect(describeFileForPreflight({ name: "image.png", type: "image/png", size: 1000 }).inspectable).toBe(false);
  });
});
