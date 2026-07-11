import type { TrailCheckpoint } from "@/types/trail";

export type TimedMilestone = TrailCheckpoint & {
  elapsedMs: number;
  remainingMs: number;
};

export const getTimedMilestones = (
  checkpoints: readonly TrailCheckpoint[],
  durationMs: number,
): TimedMilestone[] =>
  checkpoints.map((checkpoint) => {
    const elapsedMs = Math.round(durationMs * checkpoint.progress);
    return {
      ...checkpoint,
      elapsedMs,
      remainingMs: Math.max(0, durationMs - elapsedMs),
    };
  });
