import { describe, expect, it } from "vitest";
import {
  DEFAULT_SELECTED_CONTEXT_CANDIDATE_CONFIDENCE,
  selectContextCandidateIdsByConfidence
} from "../src";
import { buildContextRiskCandidate } from "./testBuilders";

describe("selectContextCandidateIdsByConfidence", () => {
  it("既定ではconfidence 0.75以上の候補IDだけを返す", () => {
    const selectedIds = selectContextCandidateIdsByConfidence([
      buildContextRiskCandidate({ id: "low", confidence: 0.74 }),
      buildContextRiskCandidate({ id: "border", confidence: DEFAULT_SELECTED_CONTEXT_CANDIDATE_CONFIDENCE }),
      buildContextRiskCandidate({ id: "high", confidence: 0.9 })
    ]);

    expect(selectedIds).toEqual(["border", "high"]);
  });

  it("しきい値を指定できる", () => {
    const selectedIds = selectContextCandidateIdsByConfidence(
      [buildContextRiskCandidate({ id: "mid", confidence: 0.7 }), buildContextRiskCandidate({ id: "high", confidence: 0.9 })],
      0.8
    );

    expect(selectedIds).toEqual(["high"]);
  });

  it("候補が空なら空配列を返す", () => {
    expect(selectContextCandidateIdsByConfidence([])).toEqual([]);
  });
});
