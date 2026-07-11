import Link from "next/link";

import { TimerPanel } from "@/components/timer/timer-panel";
import type { LevelProgress, ExpeditionProfile } from "@/types/gamification";
import type { SessionStatus } from "@/types/session";

type ExpeditionSidebarProps = {
  mountainName: string;
  mountainRegion: string;
  mountainDifficulty: string;
  status: SessionStatus;
  durationMs: number;
  remainingMs: number;
  progress: number;
  hydrated: boolean;
  checkpointCount: number;
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
  mountainRegion,
  mountainDifficulty,
  status,
  durationMs,
  remainingMs,
  progress,
  hydrated,
  checkpointCount,
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
  const active = status === "running" || status === "paused";

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
            <span aria-hidden="true">▲</span>
            <div>
              <strong>Summitodoro</strong>
              <small>Focus expedition console</small>
            </div>
          </Link>
          <span className="dashboard-local-status">
            <i /> Local
          </span>
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
            <small>1 available</small>
          </div>
          <label className="mountain-select-label">
            <span className="mountain-select-emblem" aria-hidden="true">
              ▲
            </span>
            <span className="mountain-select-copy">
              <select aria-label="Select mountain" defaultValue="mt-ulap">
                <option value="mt-ulap">{mountainName}</option>
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
              <strong>Trailblazer · Level {level.level}</strong>
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
              {reachedCheckpointCount}/{checkpointCount}
            </b>
          </div>
          <div className="objective-meter">
            <span
              style={{
                width: `${(reachedCheckpointCount / checkpointCount) * 100}%`,
              }}
            />
          </div>
          <p>
            Reach both trail checkpoints to collect the full expedition bonus.
          </p>
        </section>

        <TimerPanel
          status={status}
          durationMs={durationMs}
          remainingMs={remainingMs}
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
        <div className="avatar" aria-hidden="true">
          <span>◕‿◕</span>
        </div>
        <div>
          <small>Hiker profile</small>
          <strong>Trailblazer</strong>
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
