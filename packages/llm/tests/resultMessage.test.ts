import { describe, expect, it } from "vitest";
import {
  CONTEXT_ANALYSIS_EMPTY_MESSAGE,
  CONTEXT_ANALYSIS_FOUND_MESSAGE,
  createContextAnalysisCompleteMessage,
  createContextAnalysisResultMessage
} from "../src";

describe("AI文脈チェック完了メッセージ", () => {
  it("候補があれば注意候補の発見を伝える", () => {
    expect(createContextAnalysisCompleteMessage(1)).toBe(CONTEXT_ANALYSIS_FOUND_MESSAGE);
  });

  it("候補がなければ安全を保証しない旨を伝える", () => {
    expect(createContextAnalysisResultMessage({ candidateCount: 0 })).toBe(CONTEXT_ANALYSIS_EMPTY_MESSAGE);
  });
});
