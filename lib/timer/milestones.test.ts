import { describe, expect, it } from "vitest";

import { getTimedMilestones } from "./milestones";

const checkpoints = [
  { id: "first", name: "First", description: "", progress: 0.35 },
  { id: "second", name: "Second", description: "", progress: 0.7 },
];

describe("getTimedMilestones", () => {
  it("scales checkpoint times to the selected focus duration", () => {
    expect(getTimedMilestones(checkpoints, 25 * 60_000)).toMatchObject([
      { id: "first", elapsedMs: 525_000, remainingMs: 975_000 },
      { id: "second", elapsedMs: 1_050_000, remainingMs: 450_000 },
    ]);
  });

  it("keeps the same route proportions for a short session", () => {
    expect(getTimedMilestones(checkpoints, 5 * 60_000)).toMatchObject([
      { id: "first", elapsedMs: 105_000, remainingMs: 195_000 },
      { id: "second", elapsedMs: 210_000, remainingMs: 90_000 },
    ]);
  });
});
