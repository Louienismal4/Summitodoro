"use client";

import { useEffect, useMemo, useState } from "react";

import {
  awardCompletedSession,
  calculateSessionReward,
  createExpeditionProfile,
  getLevelProgress,
  parseExpeditionProfile,
} from "@/lib/gamification/progression";
import type { FocusSession } from "@/types/session";

const STORAGE_KEY = "summitodoro:expedition-profile";

export const useExpeditionProfile = (
  session: FocusSession,
  reachedCheckpointCount: number,
) => {
  const [profile, setProfile] = useState(createExpeditionProfile);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const persisted = stored ? parseExpeditionProfile(stored) : null;

    /* eslint-disable react-hooks/set-state-in-effect -- synchronizing React with localStorage after hydration */
    if (persisted) setProfile(persisted);
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, [hydrated, profile]);

  useEffect(() => {
    if (!hydrated || session.status !== "completed") return;
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      setProfile(
        (current) =>
          awardCompletedSession(
            current,
            session.id,
            session.durationMs,
            reachedCheckpointCount,
          ).profile,
      );
    });

    return () => {
      cancelled = true;
    };
  }, [hydrated, reachedCheckpointCount, session]);

  const projectedReward = useMemo(
    () => calculateSessionReward(session.durationMs, reachedCheckpointCount),
    [reachedCheckpointCount, session.durationMs],
  );

  return useMemo(
    () => ({
      profile,
      hydrated,
      level: getLevelProgress(profile.xp),
      lastReward: session.status === "completed" ? projectedReward : null,
      projectedReward,
    }),
    [hydrated, profile, projectedReward, session.status],
  );
};
