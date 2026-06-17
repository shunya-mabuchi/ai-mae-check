import { describe, expect, it } from "vitest";
import { toggleSelectedId } from "./demoSelection";

describe("demoSelection", () => {
  it("未選択のIDを末尾に追加する", () => {
    expect(toggleSelectedId(["email"], "phone")).toEqual(["email", "phone"]);
  });

  it("選択済みのIDを取り除く", () => {
    expect(toggleSelectedId(["email", "phone", "project"], "phone")).toEqual(["email", "project"]);
  });

  it("元の配列を変更しない", () => {
    const currentIds = ["email"];

    toggleSelectedId(currentIds, "phone");

    expect(currentIds).toEqual(["email"]);
  });
});
