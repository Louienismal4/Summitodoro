"use client";

import { useMemo, useState } from "react";

import { formatTaskFocusTime } from "@/lib/tasks/task";
import type {
  CreateTaskInput,
  Task,
  TaskFocusSession,
  TaskStatus,
  UpdateTaskInput,
} from "@/types/task";

type TaskPanelProps = {
  tasks: readonly Task[];
  sessions: readonly TaskFocusSession[];
  selectedTaskId: string | null;
  selectionLocked: boolean;
  onSelect: (taskId: string | null) => void;
  onCreate: (input: CreateTaskInput) => Task;
  onUpdate: (taskId: string, input: UpdateTaskInput) => void;
  onDelete: (taskId: string) => void;
};

const statusLabel: Record<TaskStatus, string> = {
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

export function TaskPanel({
  tasks,
  sessions,
  selectedTaskId,
  selectionLocked,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
}: TaskPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const activeTasks = useMemo(
    () => tasks.filter((task) => task.status === "active"),
    [tasks],
  );
  const historicalTasks = useMemo(
    () => tasks.filter((task) => task.status !== "active"),
    [tasks],
  );
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setTitle("");
    setDescription("");
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return;
    if (editingId) {
      onUpdate(editingId, { title, description });
    } else {
      const task = onCreate({ title, description });
      onSelect(task.id);
    }
    resetForm();
  };

  const beginEdit = (task: Task) => {
    setEditingId(task.id);
    setTitle(task.title);
    setDescription(task.description ?? "");
    setShowForm(true);
  };

  const renderTask = (task: Task) => (
    <article
      key={task.id}
      className={
        task.id === selectedTaskId ? "task-card selected" : "task-card"
      }
    >
      <div className="task-card-main">
        <button
          type="button"
          className="task-select-button"
          disabled={selectionLocked || task.status !== "active"}
          aria-pressed={task.id === selectedTaskId}
          onClick={() => onSelect(task.id === selectedTaskId ? null : task.id)}
        >
          <span className="task-selection-mark" aria-hidden="true">
            {task.id === selectedTaskId ? "✓" : ""}
          </span>
          <span>
            <strong>{task.title}</strong>
            {task.description && <small>{task.description}</small>}
          </span>
        </button>
        <span className={`task-status task-status-${task.status}`}>
          {statusLabel[task.status]}
        </span>
      </div>
      <div className="task-metrics">
        <span>{formatTaskFocusTime(task.totalFocusSeconds)} focused</span>
        <span>
          {task.completedSessionCount} session
          {task.completedSessionCount === 1 ? "" : "s"}
        </span>
      </div>
      {sessions.some((session) => session.taskId === task.id) && (
        <p className="task-climbs">
          Climbs:{" "}
          {[
            ...new Set(
              sessions
                .filter((session) => session.taskId === task.id)
                .map((session) => session.mountainName),
            ),
          ].join(", ")}
        </p>
      )}
      <div className="task-actions">
        {task.status === "active" && (
          <button
            type="button"
            onClick={() => {
              if (task.id === selectedTaskId) onSelect(null);
              onUpdate(task.id, { status: "completed" });
            }}
          >
            Complete
          </button>
        )}
        {task.status === "completed" && (
          <button
            type="button"
            onClick={() => onUpdate(task.id, { status: "active" })}
          >
            Reopen
          </button>
        )}
        <button type="button" onClick={() => beginEdit(task)}>
          Edit
        </button>
        <button
          type="button"
          onClick={() => {
            if (task.id === selectedTaskId) onSelect(null);
            onDelete(task.id);
          }}
        >
          Delete
        </button>
      </div>
    </article>
  );

  return (
    <section
      className="hud-card task-panel"
      aria-labelledby="task-panel-heading"
    >
      <div className="hud-card-heading">
        <span>☑</span>
        <strong id="task-panel-heading">Focus task</strong>
        <small>{activeTasks.length} active</small>
      </div>
      <p className="task-intro">
        {selectedTask
          ? `Next summit will count toward “${selectedTask.title}”.`
          : "Choose a task to give this expedition a goal."}
      </p>
      <div className="task-selection-row">
        <button
          type="button"
          className={selectedTask ? "task-current selected" : "task-current"}
          disabled={selectionLocked}
          onClick={() => onSelect(null)}
        >
          {selectedTask ? selectedTask.title : "No task selected"}
        </button>
        <button
          type="button"
          className="task-new-button"
          onClick={() => {
            setEditingId(null);
            setTitle("");
            setDescription("");
            setShowForm(true);
          }}
        >
          + New
        </button>
      </div>
      {showForm && (
        <form className="task-form" onSubmit={submit}>
          <label>
            Task title
            <input
              value={title}
              maxLength={120}
              autoFocus
              placeholder="Finish portfolio landing page"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label>
            Description <small>optional</small>
            <textarea
              value={description}
              maxLength={1_000}
              rows={2}
              placeholder="What does done look like?"
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <div>
            <button className="primary-button" type="submit">
              {editingId ? "Save task" : "Create task"}
            </button>
            <button className="task-cancel" type="button" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {activeTasks.length > 0 && (
        <div className="task-list">{activeTasks.map(renderTask)}</div>
      )}
      {activeTasks.length === 0 && !showForm && (
        <p className="task-empty">
          Create a task, then select it before you deploy your hiker.
        </p>
      )}
      {historicalTasks.length > 0 && (
        <div className="task-history">
          <button
            type="button"
            onClick={() => setShowCompleted((visible) => !visible)}
          >
            {showCompleted ? "Hide" : "View"} completed and archived (
            {historicalTasks.length})
          </button>
          {showCompleted && (
            <div className="task-list">{historicalTasks.map(renderTask)}</div>
          )}
        </div>
      )}
    </section>
  );
}
