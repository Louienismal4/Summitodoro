"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { TimerPanel } from "@/components/timer/timer-panel";
import { formatRemainingTime } from "@/lib/timer/format-time";
import { getTimedMilestones } from "@/lib/timer/milestones";
import type { LevelProgress, ExpeditionProfile } from "@/types/gamification";
import type { SessionStatus } from "@/types/session";
import type { TrailCheckpoint } from "@/types/trail";

type MountainOption = {
  slug: string;
  name: string;
  region: string;
  difficulty: string;
};

type ExpeditionSidebarProps = {
  mountainName: string;
  mountainSlug: string;
  mountainRegion: string;
  mountainDifficulty: string;
  mountainOptions: readonly MountainOption[];
  status: SessionStatus;
  durationMs: number;
  remainingMs: number;
  isOnBreak: boolean;
  shortBreakRemainingMs: number;
  progress: number;
  hydrated: boolean;
  checkpoints: readonly TrailCheckpoint[];
  reachedCheckpointIds: readonly string[];
  reachedCheckpointCount: number;
  projectedXp: number;
  profile: ExpeditionProfile;
  level: LevelProgress;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onDurationChange: (durationMs: number) => void;
};

export function ExpeditionSidebar({
  mountainName,
  mountainSlug,
  mountainRegion,
  mountainDifficulty,
  mountainOptions,
  status,
  durationMs,
  remainingMs,
  isOnBreak,
  shortBreakRemainingMs,
  progress,
  hydrated,
  checkpoints,
  reachedCheckpointIds,
  reachedCheckpointCount,
  projectedXp,
  profile,
  level,
  onStart,
  onPause,
  onResume,
  onReset,
  onDurationChange,
}: ExpeditionSidebarProps) {
  const router = useRouter();
  const active = status === "running" || status === "paused";
  const timedMilestones = getTimedMilestones(checkpoints, durationMs);

  return (
    <aside className="expedition-sidebar" aria-label="Expedition dashboard">
      <div className="bottom-sheet-handle" aria-hidden="true" />
      <div className="sidebar-scroll">
        <header className="dashboard-header">
          <Link
            href="/"
            className="dashboard-brand"
            aria-label="Summitodoro dashboard"
          >
            <Image
              className="dashboard-brand-logo"
              src="/summitodoro-logo.svg"
              alt=""
              width={1200}
              height={700}
              priority
            />
          </Link>
        </header>

        <section className={active ? "mission-brief active" : "mission-brief"}>
          <div className="mission-icon" aria-hidden="true">
            {active ? "⚑" : "▲"}
          </div>
          <div>
            <span className="hud-label">
              {active ? "Active expedition" : "No active expedition"}
            </span>
            <h2>
              {active ? `${mountainName} summit push` : "Your trail is waiting"}
            </h2>
            <p>
              {active
                ? "Stay on task. Your hiker advances with every focused minute."
                : "Choose a mountain and focus duration, then deploy your hiker."}
            </p>
          </div>
        </section>

        <section className="hud-card mountain-selector-card">
          <div className="hud-card-heading">
            <span>△</span>
            <strong>Mountain selector</strong>
            <small>{mountainOptions.length} available</small>
          </div>
          <label className="mountain-select-label">
            <span className="mountain-select-emblem" aria-hidden="true">
              ▲
            </span>
            <span className="mountain-select-copy">
              <select
                aria-label="Select mountain"
                value={mountainSlug}
                disabled={active}
                onChange={(event) =>
                  router.push(`/hike/${event.currentTarget.value}`)
                }
              >
                {mountainOptions.map((mountain) => (
                  <option key={mountain.slug} value={mountain.slug}>
                    {mountain.name}
                  </option>
                ))}
              </select>
              <small>{mountainRegion}</small>
            </span>
            <b>{mountainDifficulty}</b>
          </label>
        </section>

        <section className="hud-card expedition-summary">
          <div className="hud-card-heading">
            <span>♜</span>
            <strong>Expedition summary</strong>
            <small>Local profile</small>
          </div>
          <div className="summary-grid">
            <div>
              <span>◷</span>
              <small>Focus time</small>
              <strong>{profile.totalFocusMinutes}m</strong>
            </div>
            <div>
              <span>⚑</span>
              <small>Summits</small>
              <strong>{profile.completedSummits}</strong>
            </div>
            <div>
              <span>⌁</span>
              <small>Focus chain</small>
              <strong>{profile.focusChain}</strong>
            </div>
          </div>
          <div className="mission-reward-row">
            <span>Mission reward</span>
            <strong>+{projectedXp} XP</strong>
          </div>
        </section>

        <section className="hud-card level-card">
          <div className="hud-card-heading">
            <span>✦</span>
            <strong>Hiker XP</strong>
            <b>{profile.xp}</b>
          </div>
          <div className="level-row">
            <div className="level-shield">{level.level}</div>
            <div>
              <strong>
                {profile.displayName} · Level {level.level}
              </strong>
              <small>
                {level.currentLevelXp} / {level.nextLevelXp} XP to next rank
              </small>
            </div>
          </div>
          <div
            className="segmented-progress"
            aria-label={`${Math.round(level.progress * 100)} percent to next level`}
          >
            {Array.from({ length: 10 }, (_, index) => (
              <span
                key={index}
                className={
                  index < Math.ceil(level.progress * 10) ? "filled" : ""
                }
              />
            ))}
          </div>
        </section>

        <section className="hud-card objective-card">
          <div className="hud-card-heading">
            <span>⌖</span>
            <strong>Trail objectives</strong>
            <b>
              {reachedCheckpointCount}/{checkpoints.length}
            </b>
          </div>
          <div className="objective-meter">
            <span
              style={{
                width: `${checkpoints.length === 0 ? 0 : (reachedCheckpointCount / checkpoints.length) * 100}%`,
              }}
            />
          </div>
          <div className="objective-list">
            {timedMilestones.map((milestone, index) => {
              const reached = reachedCheckpointIds.includes(milestone.id);
              return (
                <div
                  key={milestone.id}
                  className={reached ? "objective reached" : "objective"}
                >
                  <span>{reached ? "✓" : index + 1}</span>
                  <div>
                    <strong>{milestone.name}</strong>
                    <small>
                      Unlocks at {formatRemainingTime(milestone.elapsedMs)}{" "}
                      elapsed · {formatRemainingTime(milestone.remainingMs)}{" "}
                      left
                    </small>
                  </div>
                </div>
              );
            })}
            <div
              className={
                status === "completed"
                  ? "objective summit reached"
                  : "objective summit"
              }
            >
              <span>{status === "completed" ? "✓" : "▲"}</span>
              <div>
                <strong>Summit</strong>
                <small>
                  Completes at {formatRemainingTime(durationMs)} elapsed ·
                  00:00:00 left
                </small>
              </div>
            </div>
          </div>
          <p>
            Checkpoint times scale with your selected focus duration. Pausing
            freezes both the timer and hiker.
          </p>
        </section>

        <TimerPanel
          status={status}
          durationMs={durationMs}
          remainingMs={remainingMs}
          isOnBreak={isOnBreak}
          shortBreakRemainingMs={shortBreakRemainingMs}
          progress={progress}
          hydrated={hydrated}
          onStart={onStart}
          onPause={onPause}
          onResume={onResume}
          onReset={onReset}
          onDurationChange={onDurationChange}
        />
      </div>

      <section className="hiker-profile">
        <div
          className={profile.avatarUrl ? "avatar has-photo" : "avatar"}
          aria-hidden="true"
          style={
            profile.avatarUrl
              ? { backgroundImage: `url("${profile.avatarUrl}")` }
              : undefined
          }
        >
          <span>◕‿◕</span>
        </div>
        <div>
          <small>Hiker profile</small>
          <strong>{profile.displayName}</strong>
          <span>
            Level {level.level} · {profile.xp} XP
          </span>
        </div>
        <div className={active ? "profile-status active" : "profile-status"}>
          {active ? "ON TRAIL" : "AT CAMP"}
        </div>
      </section>
    </aside>
  );
}
