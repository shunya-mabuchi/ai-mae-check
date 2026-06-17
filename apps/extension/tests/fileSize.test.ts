import { describe, expect, it } from "vitest";
import { formatFileSize } from "../src/lib/fileSize";

describe("formatFileSize", () => {
  it("1024バイト未満はBで表示する", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(1023)).toBe("1023 B");
  });

  it("1MB未満はKBで小数1桁表示にする", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("1MB以上はMBで小数1桁表示にする", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });
});
