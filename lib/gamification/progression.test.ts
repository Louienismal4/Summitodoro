import { describe, expect, it } from "vitest";

import {
  awardCompletedSession,
  calculateSessionReward,
  createExpeditionProfile,
  getLevelProgress,
  parseExpeditionProfile,
} from "@/lib/gamification/progression";

describe("expedition progression", () => {
  it("calculates focus, checkpoint, and summit XP", () => {
    expect(calculateSessionReward(25 * 60_000, 2)).toEqual({
      focusXp: 250,
      checkpointXp: 50,
      summitXp: 50,
      totalXp: 350,
    });
  });

  it("awards a completed session exactly once", () => {
    const initial = createExpeditionProfile();
    const first = awardCompletedSession(initial, "session-1", 5 * 60_000, 2);
    const duplicate = awardCompletedSession(
      first.profile,
      "session-1",
      5 * 60_000,
      2,
    );

    expect(first.reward?.totalXp).toBe(150);
    expect(first.profile.completedSummits).toBe(1);
    expect(duplicate.reward).toBeNull();
    expect(duplicate.profile).toBe(first.profile);
  });

  it("derives level progress from total XP", () => {
    expect(getLevelProgress(750)).toEqual({
      level: 2,
      currentLevelXp: 250,
      nextLevelXp: 500,
      progress: 0.5,
    });
  });

  it("rejects malformed local progression data", () => {
    expect(parseExpeditionProfile("not-json")).toBeNull();
  });
});
