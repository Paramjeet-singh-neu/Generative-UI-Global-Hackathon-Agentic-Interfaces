import { describe, expect, it } from "vitest";

import { initialState, mergeAgentState } from "./state";

describe("mergeAgentState", () => {
  it("defaults coaching fields for empty snapshot", () => {
    const s = mergeAgentState({});
    expect(s.coaching_status).toBe("idle");
    expect(s.coaching_data).toBeNull();
    expect(s.coaching_score_history).toEqual([]);
    expect(s.clips_analyzed).toBe(initialState.clips_analyzed);
  });

  it("merges coaching_score_history and keeps last two finite numbers", () => {
    const s = mergeAgentState({
      coaching_score_history: [70, 82, Number.NaN, 90],
    });
    expect(s.coaching_score_history).toEqual([82, 90]);
  });

  it("preserves coaching_data and drill tallies from partial snapshot", () => {
    const s = mergeAgentState({
      coaching_status: "complete",
      clips_analyzed: 2,
      approved_drills: ["jab ladder"],
      skipped_drills: [],
    });
    expect(s.coaching_status).toBe("complete");
    expect(s.clips_analyzed).toBe(2);
    expect(s.approved_drills).toEqual(["jab ladder"]);
  });
});
