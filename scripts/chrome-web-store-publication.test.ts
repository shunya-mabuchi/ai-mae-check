import { describe, expect, it } from "vitest";
import {
  buildUpdateCheckUrl,
  listingContainsUrl,
  parsePublishedVersion
} from "./lib/chrome-web-store-publication.mjs";

const extensionId = "idedmkfplfieijdcflcogkngplhkkecc";

describe("Chrome Web Store公開状態", () => {
  it("公式更新確認URLを組み立てる", () => {
    const url = new URL(buildUpdateCheckUrl(extensionId));

    expect(url.hostname).toBe("clients2.google.com");
    expect(url.searchParams.get("response")).toBe("updatecheck");
    expect(url.searchParams.get("x")).toBe(`id=${extensionId}&uc`);
  });

  it("公開版のバージョンを読み取る", () => {
    const xml = `<gupdate><app appid="${extensionId}"><updatecheck codebase="https://example.com/main.crx" version="0.1.2" /></app></gupdate>`;

    expect(parsePublishedVersion(xml, extensionId)).toBe("0.1.2");
  });

  it("更新情報が不正な場合はエラーにする", () => {
    expect(() => parsePublishedVersion("<gupdate />", extensionId)).toThrow(
      "公開版のバージョンを更新情報から読み取れませんでした"
    );
  });

  it("掲載ページ内のURLを末尾スラッシュやJSONエスケープに依存せず確認する", () => {
    const html = String.raw`{"supportUrl":"https:\/\/shunya-mabuchi.github.io\/ai-mae-check\/support"}`;

    expect(listingContainsUrl(html, "https://shunya-mabuchi.github.io/ai-mae-check/support/")).toBe(true);
    expect(listingContainsUrl(html, "https://shunya-mabuchi.github.io/ai-mae-check/privacy/")).toBe(false);
  });
});
