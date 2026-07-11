import { z } from "zod";

import type {
  ExpeditionProfile,
  LevelProgress,
  SessionReward,
} from "@/types/gamification";

const XP_PER_LEVEL = 500;

export const expeditionProfileSchema = z.object({
  version: z.literal(1),
  xp: z.number().int().nonnegative(),
  totalFocusMinutes: z.number().int().nonnegative(),
  completedSummits: z.number().int().nonnegative(),
  focusChain: z.number().int().nonnegative(),
  completedSessionIds: z.array(z.string()),
});

export const createExpeditionProfile = (): ExpeditionProfile => ({
  version: 1,
  xp: 0,
  totalFocusMinutes: 0,
  completedSummits: 0,
  focusChain: 0,
  completedSessionIds: [],
});

export const calculateSessionReward = (
  durationMs: number,
  reachedCheckpointCount: number,
): SessionReward => {
  const focusXp = Math.floor(durationMs / 60_000) * 10;
  const checkpointXp = Math.max(0, reachedCheckpointCount) * 25;
  const summitXp = 50;
  return {
    focusXp,
    checkpointXp,
    summitXp,
    totalXp: focusXp + checkpointXp + summitXp,
  };
};

export const getLevelProgress = (xp: number): LevelProgress => {
  const safeXp = Math.max(0, Math.floor(xp));
  const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
  const currentLevelXp = safeXp % XP_PER_LEVEL;

  return {
    level,
    currentLevelXp,
    nextLevelXp: XP_PER_LEVEL,
    progress: currentLevelXp / XP_PER_LEVEL,
  };
};

export const awardCompletedSession = (
  profile: ExpeditionProfile,
  sessionId: string,
  durationMs: number,
  reachedCheckpointCount: number,
): { profile: ExpeditionProfile; reward: SessionReward | null } => {
  if (profile.completedSessionIds.includes(sessionId)) {
    return { profile, reward: null };
  }

  const reward = calculateSessionReward(durationMs, reachedCheckpointCount);
  return {
    reward,
    profile: {
      ...profile,
      xp: profile.xp + reward.totalXp,
      totalFocusMinutes:
        profile.totalFocusMinutes + Math.floor(durationMs / 60_000),
      completedSummits: profile.completedSummits + 1,
      focusChain: profile.focusChain + 1,
      completedSessionIds: [
        ...profile.completedSessionIds.slice(-99),
        sessionId,
      ],
    },
  };
};

export const parseExpeditionProfile = (
  value: string,
): ExpeditionProfile | null => {
  try {
    return expeditionProfileSchema.parse(JSON.parse(value));
  } catch {
    return null;
  }
};
