"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ExpeditionSidebar } from "@/components/hike/expedition-sidebar";
import { MountainMap } from "@/components/map/mountain-map";
import type {
  MapCheckpoint,
  MountainMapHandle,
} from "@/components/map/mountain-map";
import { TrailFallback } from "@/components/map/trail-fallback";
import { mountains } from "@/data/mountains";
import { useExpeditionProfile } from "@/hooks/use-expedition-profile";
import { useFocusSession } from "@/hooks/use-focus-session";
import { formatRemainingTime } from "@/lib/timer/format-time";
import {
  getCoordinateAtProgress,
  prepareTrail,
  validateTrailFeature,
} from "@/lib/trail/trail-engine";
import type { Mountain } from "@/types/mountain";
import type { PreparedTrail } from "@/types/trail";

export function HikeExperience({ mountain }: { mountain: Mountain }) {
  const [trail, setTrail] = useState<PreparedTrail | null>(null);
  const [trailError, setTrailError] = useState<string | null>(null);
  const [mapUnavailable, setMapUnavailable] = useState<string | null>(null);
  const [showAttribution, setShowAttribution] = useState(false);
  const mapRef = useRef<MountainMapHandle>(null);

  const focus = useFocusSession({
    storageKey: `summitodoro:session:${mountain.slug}`,
    initialDurationMs: mountain.defaultDurationMinutes * 60_000,
    checkpoints: mountain.checkpoints,
  });
  const game = useExpeditionProfile(
    focus.session,
    focus.reachedCheckpointIds.length,
  );

  useEffect(() => {
    const controller = new AbortController();

    void fetch(mountain.trailAssetUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok)
          throw new Error(`Trail request failed (${response.status}).`);
        return response.json() as Promise<unknown>;
      })
      .then((value) => setTrail(prepareTrail(validateTrailFeature(value))))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setTrailError(
          error instanceof Error ? error.message : "Trail data is unavailable.",
        );
      });

    return () => controller.abort();
  }, [mountain.trailAssetUrl]);

  const coordinate = useMemo(
    () => (trail ? getCoordinateAtProgress(trail, focus.progress) : null),
    [focus.progress, trail],
  );
  const mapCheckpoints = useMemo<MapCheckpoint[]>(
    () =>
      trail
        ? mountain.checkpoints.map((checkpoint) => ({
            id: checkpoint.id,
            name: checkpoint.name,
            coordinate: getCoordinateAtProgress(trail, checkpoint.progress),
          }))
        : [],
    [mountain.checkpoints, trail],
  );
  const nextCheckpoint = mountain.checkpoints.find(
    (checkpoint) => !focus.reachedCheckpointIds.includes(checkpoint.id),
  );
  const handleMapUnavailable = useCallback(
    (reason: string) => setMapUnavailable(reason),
    [],
  );
  const fallbackReason = trailError ?? mapUnavailable;
  const reward = game.lastReward ?? game.projectedReward;

  return (
    <main className="game-shell">
      <ExpeditionSidebar
        mountainName={mountain.name}
        mountainSlug={mountain.slug}
        mountainRegion={mountain.region}
        mountainDifficulty={mountain.difficulty}
        mountainOptions={mountains.map(
          ({ slug, name, region, difficulty }) => ({
            slug,
            name,
            region,
            difficulty,
          }),
        )}
        status={focus.session.status}
        durationMs={focus.session.durationMs}
        remainingMs={focus.remainingMs}
        isOnBreak={focus.isOnBreak}
        shortBreakRemainingMs={focus.shortBreakRemainingMs}
        progress={focus.progress}
        hydrated={focus.hydrated && game.hydrated}
        checkpoints={mountain.checkpoints}
        reachedCheckpointIds={focus.reachedCheckpointIds}
        reachedCheckpointCount={focus.reachedCheckpointIds.length}
        projectedXp={game.projectedReward.totalXp}
        profile={game.profile}
        level={game.level}
        onStart={focus.start}
        onPause={focus.pause}
        onResume={focus.resume}
        onReset={focus.reset}
        onDurationChange={focus.setDuration}
      />

      <section className="game-map" aria-label="Virtual expedition map">
        {!trail && !trailError && (
          <div className="map-loading" role="status">
            <span /> Loading expedition map…
          </div>
        )}
        {trail && coordinate && !mapUnavailable && (
          <MountainMap
            ref={mapRef}
            feature={trail.feature}
            coordinate={coordinate}
            progress={focus.progress}
            checkpoints={mapCheckpoints}
            reachedCheckpointIds={focus.reachedCheckpointIds}
            onUnavailable={handleMapUnavailable}
          />
        )}
        {fallbackReason && (
          <TrailFallback
            mountain={mountain}
            progress={focus.progress}
            reachedCheckpointIds={focus.reachedCheckpointIds}
            reason={fallbackReason}
          />
        )}

        <div className="map-mission-card map-status-ribbon">
          <div className="ribbon-stat">
            <span>△</span>
            <div>
              <small>Mountain</small>
              <strong>{mountain.name}</strong>
            </div>
          </div>
          <div className="ribbon-stat">
            <span>◆</span>
            <div>
              <small>Next checkpoint</small>
              <strong>{nextCheckpoint?.name ?? "Summit"}</strong>
            </div>
          </div>
          <div className="ribbon-stat remaining">
            <span>◷</span>
            <div>
              <small>Remaining</small>
              <strong>{formatRemainingTime(focus.remainingMs)}</strong>
            </div>
          </div>
        </div>

        <div className="map-control-stack" aria-label="Map controls">
          <button
            type="button"
            onClick={() => mapRef.current?.resetCamera()}
            title="Reset camera"
            aria-label="Reset camera"
          >
            <span>↺</span>
            <small>Reset</small>
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.fitTrail()}
            title="Fit trail"
            aria-label="Fit trail"
          >
            <span>⌗</span>
            <small>Fit trail</small>
          </button>
        </div>

        <div className="trail-identity-card">
          <span className="hud-label">Trail 01 · {mountain.province}</span>
          <h1>{mountain.name}</h1>
          <p>{mountain.trailName}</p>
        </div>

        <div className="checkpoint-dock">
          <div className="checkpoint-dock-heading">
            <span>⚑ Route objectives</span>
            <strong>
              {focus.reachedCheckpointIds.length}/{mountain.checkpoints.length}{" "}
              complete
            </strong>
          </div>
          <div className="checkpoint-route">
            <div className="checkpoint-node reached">
              <span>✓</span>
              <small>Trailhead</small>
            </div>
            {mountain.checkpoints.map((checkpoint) => {
              const reached = focus.reachedCheckpointIds.includes(
                checkpoint.id,
              );
              return (
                <div
                  key={checkpoint.id}
                  className={
                    reached ? "checkpoint-node reached" : "checkpoint-node"
                  }
                >
                  <span>{reached ? "✓" : "+25"}</span>
                  <small>{checkpoint.name}</small>
                </div>
              );
            })}
            <div
              className={
                focus.session.status === "completed"
                  ? "checkpoint-node reached summit"
                  : "checkpoint-node summit"
              }
            >
              <span>▲</span>
              <small>Summit</small>
            </div>
          </div>
        </div>

        <div className="map-duration-dock" aria-label="Focus duration presets">
          <span>
            <i /> Focus duration
          </span>
          {[30, 45, 60, 90, 120].map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={
                focus.session.durationMs === minutes * 60_000 ? "active" : ""
              }
              disabled={focus.session.status !== "idle" || !focus.hydrated}
              onClick={() => focus.setDuration(minutes * 60_000)}
            >
              {minutes}m
            </button>
          ))}
        </div>

        <div className="map-attribution-wrap">
          {showAttribution && (
            <div
              className="attribution-dialog"
              role="dialog"
              aria-label="Map and route attribution"
            >
              <strong>Map & route information</strong>
              <p>{mountain.source.attribution}</p>
              <p>
                <b>Virtual focus route only.</b> Not for real-world navigation
                or safety decisions.
              </p>
              <small>
                {mountain.source.reference} · v{mountain.trailVersion}
              </small>
            </div>
          )}
          <button
            type="button"
            className="attribution-button"
            aria-label="Show map attribution and safety information"
            aria-expanded={showAttribution}
            onClick={() => setShowAttribution((current) => !current)}
          >
            ⓘ
          </button>
        </div>
      </section>

      {focus.latestCheckpoint && (
        <div className="checkpoint-toast" role="status">
          <span aria-hidden="true">+25</span>
          <div>
            <small>Checkpoint unlocked</small>
            <strong>{focus.latestCheckpoint.name}</strong>
            <p>{focus.latestCheckpoint.description}</p>
          </div>
          <button
            type="button"
            onClick={focus.dismissCheckpoint}
            aria-label="Dismiss checkpoint message"
          >
            ×
          </button>
        </div>
      )}

      {focus.session.status === "completed" && (
        <div
          className="completion-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="completion-title"
        >
          <div className="completion-card game-completion-card">
            <span className="summit-emblem" aria-hidden="true">
              ▲
            </span>
            <span className="hud-label">Expedition complete</span>
            <h2 id="completion-title">Summit secured!</h2>
            <p>
              Your focused ascent of {mountain.name} is complete. Rewards have
              been added to your local hiker profile.
            </p>
            <div className="reward-breakdown">
              <div>
                <small>Focus XP</small>
                <strong>+{reward.focusXp}</strong>
              </div>
              <div>
                <small>Checkpoint XP</small>
                <strong>+{reward.checkpointXp}</strong>
              </div>
              <div>
                <small>Summit bonus</small>
                <strong>+{reward.summitXp}</strong>
              </div>
              <div className="reward-total">
                <small>Total earned</small>
                <strong>+{reward.totalXp} XP</strong>
              </div>
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={focus.reset}
            >
              Return to trail camp
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
