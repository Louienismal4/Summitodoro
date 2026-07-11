export type ExpeditionProfile = {
  version: 1;
  xp: number;
  totalFocusMinutes: number;
  completedSummits: number;
  focusChain: number;
  completedSessionIds: string[];
};

export type SessionReward = {
  focusXp: number;
  checkpointXp: number;
  summitXp: number;
  totalXp: number;
};

export type LevelProgress = {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number;
};
