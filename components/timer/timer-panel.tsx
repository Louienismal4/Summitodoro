import { formatRemainingTime } from "@/lib/timer/format-time";
import type { SessionStatus } from "@/types/session";

type TimerPanelProps = {
  status: SessionStatus;
  durationMs: number;
  remainingMs: number;
  progress: number;
  hydrated: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onDurationChange: (durationMs: number) => void;
};

const presets = [5, 15, 25];

export function TimerPanel({
  status,
  durationMs,
  remainingMs,
  progress,
  hydrated,
  onStart,
  onPause,
  onResume,
  onReset,
  onDurationChange,
}: TimerPanelProps) {
  const activeMinutes = durationMs / 60_000;
  const timerLabel =
    status === "completed"
      ? "Summit reached"
      : formatRemainingTime(remainingMs);

  return (
    <section className="timer-panel" aria-labelledby="focus-timer-heading">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Pomodoro console</span>
          <h2 id="focus-timer-heading">Focus control</h2>
        </div>
        <span className={`status-badge status-${status}`}>{status}</span>
      </div>

      <div className="preset-group" aria-label="Focus duration">
        {presets.map((minutes) => (
          <button
            key={minutes}
            className={activeMinutes === minutes ? "preset active" : "preset"}
            type="button"
            disabled={status !== "idle" || !hydrated}
            onClick={() => onDurationChange(minutes * 60_000)}
          >
            {minutes} min
          </button>
        ))}
      </div>

      <div className="timer-face" aria-live="off">
        <span className="timer-label">
          {status === "idle" ? "Ready when you are" : "Time remaining"}
        </span>
        <strong
          aria-label={`${Math.ceil(remainingMs / 1000)} seconds remaining`}
        >
          {hydrated ? timerLabel : "--:--"}
        </strong>
        <span className="progress-copy">
          {Math.round(progress * 100)}% of trail
        </span>
      </div>

      <div className="timer-progress" aria-hidden="true">
        <span style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="timer-actions">
        {status === "idle" && (
          <button
            className="primary-button"
            type="button"
            disabled={!hydrated}
            onClick={onStart}
          >
            Deploy hiker
          </button>
        )}
        {status === "running" && (
          <button className="primary-button" type="button" onClick={onPause}>
            Pause
          </button>
        )}
        {status === "paused" && (
          <button className="primary-button" type="button" onClick={onResume}>
            Resume
          </button>
        )}
        <button
          className="secondary-button"
          type="button"
          disabled={!hydrated}
          onClick={onReset}
        >
          Reset
        </button>
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {status === "completed"
          ? "Focus session complete. Summit reached."
          : `${Math.ceil(remainingMs / 60_000)} minutes remaining.`}
      </p>
    </section>
  );
}
