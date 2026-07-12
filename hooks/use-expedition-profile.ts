"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  awardCompletedSession,
  calculateSessionReward,
  createExpeditionProfile,
  getLevelProgress,
  parseExpeditionProfile,
  sanitizeProfileIdentity,
} from "@/lib/gamification/progression";
import { supabase } from "@/lib/supabase/client";
import type { FocusSession } from "@/types/session";
import type { ExpeditionProfile } from "@/types/gamification";
import type { MountainDifficulty } from "@/types/mountain";

const STORAGE_KEY = "summitodoro:expedition-profile";

type StoredHikerProfile = {
  display_name: string;
  avatar_url: string | null;
  xp: number;
  total_focus_minutes: number;
  completed_summits: number;
  focus_chain: number;
  completed_session_ids: unknown;
};

const toExpeditionProfile = (profile: StoredHikerProfile): ExpeditionProfile =>
  parseExpeditionProfile(
    JSON.stringify({
      version: 1,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      onboardingComplete: true,
      xp: profile.xp,
      totalFocusMinutes: profile.total_focus_minutes,
      completedSummits: profile.completed_summits,
      focusChain: profile.focus_chain,
      completedSessionIds: profile.completed_session_ids,
    }),
  ) ?? createExpeditionProfile();

export const useExpeditionProfile = (
  session: FocusSession,
  reachedCheckpointCount: number,
  difficulty: MountainDifficulty = "moderate",
) => {
  const [profile, setProfile] = useState(createExpeditionProfile);
  const [hydrated, setHydrated] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [cloudReady, setCloudReady] = useState(false);

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
    if (!hydrated || !supabase) return;
    let cancelled = false;

    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data.user) return;

      const { data: savedProfile } = await supabase
        .from("hiker_profiles")
        .select(
          "display_name, avatar_url, xp, total_focus_minutes, completed_summits, focus_chain, completed_session_ids",
        )
        .eq("id", data.user.id)
        .maybeSingle();

      if (cancelled) return;
      if (savedProfile) setProfile(toExpeditionProfile(savedProfile));
      setAccountId(data.user.id);
      setCloudReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!cloudReady || !accountId || !supabase) return;

    void supabase.from("hiker_profiles").upsert(
      {
        id: accountId,
        display_name: profile.displayName,
        avatar_url: profile.avatarUrl,
        xp: profile.xp,
        total_focus_minutes: profile.totalFocusMinutes,
        completed_summits: profile.completedSummits,
        focus_chain: profile.focusChain,
        completed_session_ids: profile.completedSessionIds,
      },
      { onConflict: "id" },
    );
  }, [accountId, cloudReady, profile]);

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
            difficulty,
          ).profile,
      );
    });

    return () => {
      cancelled = true;
    };
  }, [difficulty, hydrated, reachedCheckpointCount, session]);

  const projectedReward = useMemo(
    () => calculateSessionReward(session.durationMs, reachedCheckpointCount, difficulty),
    [difficulty, reachedCheckpointCount, session.durationMs],
  );

  const updateIdentity = useCallback(
    (displayName: string, avatarUrl: string | null) => {
      setProfile((current) => ({
        ...current,
        ...sanitizeProfileIdentity(displayName, avatarUrl),
      }));
    },
    [],
  );

  return useMemo(
    () => ({
      profile,
      hydrated,
      level: getLevelProgress(profile.xp),
      lastReward: session.status === "completed" ? projectedReward : null,
      projectedReward,
      updateIdentity,
    }),
    [hydrated, profile, projectedReward, session.status, updateIdentity],
  );
};
