"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  completeSessionIfElapsed,
  createFocusSession,
  getProgress,
  getRemainingMs,
  parsePersistedSession,
  pauseSession,
  resumeSession,
  startSession,
} from "@/lib/timer/focus-session";
import { getNewlyReachedCheckpoints } from "@/lib/trail/checkpoints";
import type { FocusSession, PersistedFocusSession } from "@/types/session";
import type { TrailCheckpoint } from "@/types/trail";

type UseFocusSessionOptions = {
  storageKey: string;
  initialDurationMs: number;
  checkpoints: TrailCheckpoint[];
};

export const useFocusSession = ({
  storageKey,
  initialDurationMs,
  checkpoints,
}: UseFocusSessionOptions) => {
  const [session, setSession] = useState<FocusSession>(() =>
    createFocusSession(initialDurationMs),
  );
  const [now, setNow] = useState(Date.now);
  const [hydrated, setHydrated] = useState(false);
  const [reachedCheckpointIds, setReachedCheckpointIds] = useState<string[]>(
    [],
  );
  const [latestCheckpoint, setLatestCheckpoint] =
    useState<TrailCheckpoint | null>(null);
  const previousProgress = useRef(0);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    const persisted = stored ? parsePersistedSession(stored) : null;
    const hydrationTime = Date.now();
    const recovered = persisted
      ? completeSessionIfElapsed(persisted.session, hydrationTime)
      : null;

    // Hydration is an external storage response; defer its state update so the
    // effect itself remains a pure subscription boundary.
    queueMicrotask(() => {
      if (recovered && persisted) {
        setSession(recovered);
        setReachedCheckpointIds(persisted.reachedCheckpointIds);
        previousProgress.current = getProgress(recovered, hydrationTime);
      }
      setNow(hydrationTime);
      setHydrated(true);
    });
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    const persisted: PersistedFocusSession = {
      version: 1,
      session,
      reachedCheckpointIds,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(persisted));
  }, [hydrated, reachedCheckpointIds, session, storageKey]);

  useEffect(() => {
    if (session.status !== "running") return;

    const updateFromClock = () => {
      const currentTime = Date.now();
      setNow(currentTime);
      setSession((current) => completeSessionIfElapsed(current, currentTime));
    };

    updateFromClock();
    const interval = window.setInterval(updateFromClock, 250);
    return () => window.clearInterval(interval);
  }, [session.status]);

  const progress = getProgress(session, now);

  useEffect(() => {
    if (!hydrated || progress <= previousProgress.current) {
      previousProgress.current = progress;
      return;
    }

    const crossed = getNewlyReachedCheckpoints(
      checkpoints,
      previousProgress.current,
      progress,
      reachedCheckpointIds,
    );

    if (crossed.length > 0) {
      setReachedCheckpointIds((current) => [
        ...current,
        ...crossed.map((checkpoint) => checkpoint.id),
      ]);
      setLatestCheckpoint(crossed.at(-1) ?? null);
    }
    previousProgress.current = progress;
  }, [checkpoints, hydrated, progress, reachedCheckpointIds]);

  const start = useCallback(() => {
    const currentTime = Date.now();
    setNow(currentTime);
    setSession((current) => startSession(current, currentTime));
  }, []);

  const pause = useCallback(() => {
    const currentTime = Date.now();
    setNow(currentTime);
    setSession((current) => pauseSession(current, currentTime));
  }, []);

  const resume = useCallback(() => {
    const currentTime = Date.now();
    setNow(currentTime);
    setSession((current) => resumeSession(current, currentTime));
  }, []);

  const reset = useCallback(() => {
    setSession((current) => createFocusSession(current.durationMs));
    setReachedCheckpointIds([]);
    setLatestCheckpoint(null);
    previousProgress.current = 0;
    setNow(Date.now());
  }, []);

  const setDuration = useCallback((durationMs: number) => {
    setSession((current) =>
      current.status === "idle" ? createFocusSession(durationMs) : current,
    );
    previousProgress.current = 0;
  }, []);

  const dismissCheckpoint = useCallback(() => setLatestCheckpoint(null), []);

  return useMemo(
    () => ({
      session,
      hydrated,
      progress,
      remainingMs: getRemainingMs(session, now),
      reachedCheckpointIds,
      latestCheckpoint,
      start,
      pause,
      resume,
      reset,
      setDuration,
      dismissCheckpoint,
    }),
    [
      dismissCheckpoint,
      hydrated,
      latestCheckpoint,
      now,
      pause,
      progress,
      reachedCheckpointIds,
      reset,
      resume,
      session,
      setDuration,
      start,
    ],
  );
};
