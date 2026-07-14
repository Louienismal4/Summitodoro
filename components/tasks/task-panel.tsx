"use client";

import { useEffect, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  addSoftHyphens,
  formatTaskFocusTime,
  isTaskVisibleInFrontendHistory,
} from "@/lib/tasks/task";
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
  onReorder: (taskIds: readonly string[]) => void;
};

function SortableTask({
  id,
  children,
}: {
  id: string;
  children: (
    dragHandleProps: React.ComponentProps<typeof Button>,
  ) => React.ReactNode;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      className={
        isDragging ? "task-sortable-item is-dragging" : "task-sortable-item"
      }
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

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
  onReorder,
}: TaskPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [taskPendingDeletion, setTaskPendingDeletion] = useState<Task | null>(
    null,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const activeTasks = useMemo(
    () =>
      [...tasks]
        .filter((task) => task.status === "active")
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [tasks],
  );
  const historicalTasks = useMemo(
    () => tasks.filter((task) => isTaskVisibleInFrontendHistory(task, now)),
    [now, tasks],
  );
  const completedTasks = useMemo(
    () => historicalTasks.filter((task) => task.status === "completed"),
    [historicalTasks],
  );
  const archivedTasks = useMemo(
    () => historicalTasks.filter((task) => task.status === "archived"),
    [historicalTasks],
  );
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

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

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const previousIndex = activeTasks.findIndex(
      (task) => task.id === active.id,
    );
    const nextIndex = activeTasks.findIndex((task) => task.id === over.id);
    if (previousIndex < 0 || nextIndex < 0) return;
    onReorder(
      arrayMove(activeTasks, previousIndex, nextIndex).map((task) => task.id),
    );
  };

  const renderTask = (
    task: Task,
    dragHandleProps?: React.ComponentProps<typeof Button>,
  ) => (
    <article
      key={task.id}
      className={[
        "task-card",
        task.id === selectedTaskId && "selected",
        task.status === "archived" && "archived",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="task-card-main">
        {dragHandleProps && (
          <Button
            variant="ghost"
            size="icon"
            className="task-drag-handle"
            aria-label={`Reorder ${task.title}`}
            {...dragHandleProps}
          >
            <span aria-hidden="true">⠿</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="task-select-button"
          disabled={selectionLocked || task.status !== "active"}
          aria-pressed={task.id === selectedTaskId}
          onClick={() => onSelect(task.id === selectedTaskId ? null : task.id)}
        >
          <span>
            <strong>{task.title}</strong>
            {task.description && <small>{task.description}</small>}
          </span>
        </Button>
        <div className="task-card-controls">
          <span className={`task-status task-status-${task.status}`}>
            {statusLabel[task.status]}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="task-more-button"
                aria-label={`Manage ${task.title}`}
              >
                <span aria-hidden="true">•••</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="task-menu" align="end">
              <DropdownMenuItem onSelect={() => setViewingTask(task)}>
                View task
              </DropdownMenuItem>
              {task.status === "active" && (
                <DropdownMenuItem
                  onSelect={() => {
                    if (task.id === selectedTaskId) onSelect(null);
                    onUpdate(task.id, { status: "completed" });
                  }}
                >
                  Mark complete
                </DropdownMenuItem>
              )}
              {task.status === "completed" && (
                <DropdownMenuItem
                  onSelect={() => onUpdate(task.id, { status: "active" })}
                >
                  Reopen task
                </DropdownMenuItem>
              )}
              {task.status !== "archived" && (
                <DropdownMenuItem
                  onSelect={() => {
                    if (task.id === selectedTaskId) onSelect(null);
                    onUpdate(task.id, { status: "archived" });
                  }}
                >
                  Archive task
                </DropdownMenuItem>
              )}
              {task.status === "archived" && (
                <DropdownMenuItem
                  onSelect={() => onUpdate(task.id, { status: "active" })}
                >
                  Restore to active
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => beginEdit(task)}>
                Edit task
              </DropdownMenuItem>
              <DropdownMenuItem
                className="task-menu-delete"
                onSelect={() => setTaskPendingDeletion(task)}
              >
                Delete task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {(task.totalFocusSeconds > 0 || task.completedSessionCount > 0) && (
        <div className="task-metrics">
          {task.totalFocusSeconds > 0 && (
            <span>{formatTaskFocusTime(task.totalFocusSeconds)} focused</span>
          )}
          {task.completedSessionCount > 0 && (
            <span>
              {task.completedSessionCount} session
              {task.completedSessionCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      )}
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
        <Button
          variant="ghost"
          size="sm"
          className={selectedTask ? "task-current selected" : "task-current"}
          disabled={selectionLocked}
          onClick={() => onSelect(null)}
        >
          {selectedTask ? selectedTask.title : "No task selected"}
        </Button>
        <Button
          size="sm"
          className="task-new-button"
          onClick={() => {
            setEditingId(null);
            setTitle("");
            setDescription("");
            setShowForm(true);
          }}
        >
          + New
        </Button>
      </div>
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) resetForm();
        }}
      >
        <DialogContent className="task-dialog">
          <DialogTitle>{editingId ? "Edit task" : "Create a task"}</DialogTitle>
          <DialogDescription>
            Give your next focus expedition a clear objective.
          </DialogDescription>
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
              <Button type="submit" size="sm" className="task-save-button">
                {editingId ? "Save task" : "Create task"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="task-cancel"
                type="button"
                onClick={resetForm}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={viewingTask !== null}
        onOpenChange={(open) => {
          if (!open) setViewingTask(null);
        }}
      >
        {viewingTask && (
          <DialogContent className="task-dialog task-view-dialog">
            <span className={`task-status task-status-${viewingTask.status}`}>
              {statusLabel[viewingTask.status]}
            </span>
            <DialogTitle>{addSoftHyphens(viewingTask.title)}</DialogTitle>
            <DialogDescription>
              {viewingTask.description || "No description added yet."}
            </DialogDescription>
            {(viewingTask.totalFocusSeconds > 0 ||
              viewingTask.completedSessionCount > 0) && (
              <div className="task-view-metrics">
                {viewingTask.totalFocusSeconds > 0 && (
                  <div>
                    <small>Focus time</small>
                    <strong>
                      {formatTaskFocusTime(viewingTask.totalFocusSeconds)}
                    </strong>
                  </div>
                )}
                {viewingTask.completedSessionCount > 0 && (
                  <div>
                    <small>Completed sessions</small>
                    <strong>{viewingTask.completedSessionCount}</strong>
                  </div>
                )}
              </div>
            )}
            {sessions.some((session) => session.taskId === viewingTask.id) && (
              <div className="task-view-climbs">
                <small>Contributing climbs</small>
                <p>
                  {[
                    ...new Set(
                      sessions
                        .filter((session) => session.taskId === viewingTask.id)
                        .map((session) => session.mountainName),
                    ),
                  ].join(", ")}
                </p>
              </div>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="task-view-close"
              onClick={() => setViewingTask(null)}
            >
              Close
            </Button>
          </DialogContent>
        )}
      </Dialog>
      <Dialog
        open={taskPendingDeletion !== null}
        onOpenChange={(open) => {
          if (!open) setTaskPendingDeletion(null);
        }}
      >
        {taskPendingDeletion && (
          <DialogContent className="task-dialog task-delete-dialog">
            <DialogTitle>Delete task?</DialogTitle>
            <DialogDescription>
              “{taskPendingDeletion.title}” and its local focus history will be
              permanently removed.
            </DialogDescription>
            <div className="task-delete-actions">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTaskPendingDeletion(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="task-delete-confirm"
                onClick={() => {
                  if (taskPendingDeletion.id === selectedTaskId) onSelect(null);
                  onDelete(taskPendingDeletion.id);
                  setTaskPendingDeletion(null);
                }}
              >
                Delete task
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
      {activeTasks.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={activeTasks.map((task) => task.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="task-list task-list-sortable">
              {activeTasks.map((task) => (
                <SortableTask key={task.id} id={task.id}>
                  {(dragHandleProps) => renderTask(task, dragHandleProps)}
                </SortableTask>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      {activeTasks.length === 0 && !showForm && (
        <p className="task-empty">
          Create a task, then select it before you deploy your hiker.
        </p>
      )}
      {historicalTasks.length > 0 && (
        <div className="task-history">
          <Button
            variant="ghost"
            size="sm"
            className={
              showCompleted
                ? "task-history-toggle is-open"
                : "task-history-toggle"
            }
            onClick={() => setShowCompleted((visible) => !visible)}
          >
            <span aria-hidden="true">◷</span>
            <strong>Task history</strong>
            <b>{historicalTasks.length}</b>
            <span className="task-history-chevron" aria-hidden="true" />
          </Button>
          {showCompleted && (
            <div className="task-history-groups">
              {completedTasks.length > 0 && (
                <section className="task-history-group">
                  <div className="task-history-heading">
                    <span>✓</span>
                    <strong>Completed</strong>
                    <small>{completedTasks.length}</small>
                  </div>
                  <div className="task-list">
                    {completedTasks.map((task) => renderTask(task))}
                  </div>
                </section>
              )}
              {archivedTasks.length > 0 && (
                <section className="task-history-group archived">
                  <div className="task-history-heading">
                    <span>▣</span>
                    <strong>Archive</strong>
                    <small>{archivedTasks.length}</small>
                  </div>
                  <p>Stored away from your active expedition plan.</p>
                  <div className="task-list">
                    {archivedTasks.map((task) => renderTask(task))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
