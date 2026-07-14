"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createTask, parseStoredTasks, updateTask } from "@/lib/tasks/task";
import { supabase } from "@/lib/supabase/client";
import type {
  CreateTaskInput,
  Task,
  TaskFocusSession,
  TaskStatus,
  UpdateTaskInput,
} from "@/types/task";

const STORAGE_KEY = "summitodoro:tasks";

type StoredTaskState = {
  tasks: Task[];
  completedSessionIds: string[];
  sessions: TaskFocusSession[];
};

type DatabaseTask = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  total_focus_seconds: number;
  completed_session_count: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

const toTask = (task: DatabaseTask): Task => ({
  id: task.id,
  userId: task.user_id,
  title: task.title,
  description: task.description,
  status: task.status,
  totalFocusSeconds: task.total_focus_seconds,
  completedSessionCount: task.completed_session_count,
  sortOrder: task.sort_order,
  createdAt: task.created_at,
  updatedAt: task.updated_at,
  completedAt: task.completed_at,
});

export const useTasks = () => {
  const [state, setState] = useState<StoredTaskState>({
    tasks: [],
    completedSessionIds: [],
    sessions: [],
  });
  const [hydrated, setHydrated] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    const parsed = parseStoredTasks(
      window.localStorage.getItem(STORAGE_KEY) ?? "",
    );
    /* eslint-disable react-hooks/set-state-in-effect -- synchronizing React with localStorage after hydration */
    if (parsed) {
      setState({
        tasks: parsed.tasks,
        completedSessionIds: parsed.completedSessionIds,
        sessions: parsed.sessions,
      });
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, ...state }),
    );
  }, [hydrated, state]);

  useEffect(() => {
    if (!hydrated || !supabase) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data.user) return;
      setAccountId(data.user.id);
      await supabase.rpc("purge_expired_task_history");
      const { data: remoteTasks } = await supabase
        .from("tasks")
        .select(
          "id, user_id, title, description, status, total_focus_seconds, completed_session_count, sort_order, created_at, updated_at, completed_at",
        )
        .order("sort_order")
        .order("created_at");
      if (!cancelled && remoteTasks) {
        setState((current) => ({ ...current, tasks: remoteTasks.map(toTask) }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  const create = useCallback(
    (input: CreateTaskInput) => {
      const task = {
        ...createTask(input, accountId),
        sortOrder:
          Math.max(
            -1,
            ...state.tasks
              .filter((current) => current.status === "active")
              .map((current) => current.sortOrder),
          ) + 1,
      };
      setState((current) => ({ ...current, tasks: [task, ...current.tasks] }));
      if (accountId && supabase) {
        void supabase.from("tasks").insert({
          id: task.id,
          user_id: accountId,
          title: task.title,
          description: task.description,
          sort_order: task.sortOrder,
        });
      }
      return task;
    },
    [accountId, state.tasks],
  );

  const update = useCallback(
    (taskId: string, input: UpdateTaskInput) => {
      let nextTask: Task | null = null;
      setState((current) => ({
        ...current,
        tasks: current.tasks.map((task) => {
          if (task.id !== taskId) return task;
          nextTask = updateTask(task, input);
          return nextTask;
        }),
      }));
      if (accountId && supabase) {
        const patch: Record<string, string | null> = {};
        if (input.title !== undefined) patch.title = input.title.trim();
        if (input.description !== undefined)
          patch.description = input.description.trim() || null;
        if (input.status !== undefined) {
          patch.status = input.status;
          patch.completed_at =
            input.status === "completed" ? new Date().toISOString() : null;
        }
        void supabase.from("tasks").update(patch).eq("id", taskId);
      }
      return nextTask;
    },
    [accountId],
  );

  const remove = useCallback(
    (taskId: string) => {
      setState((current) => ({
        ...current,
        tasks: current.tasks.filter((task) => task.id !== taskId),
      }));
      if (accountId && supabase)
        void supabase.from("tasks").delete().eq("id", taskId);
    },
    [accountId],
  );

  const recordCompletedSession = useCallback(
    ({
      sessionId,
      taskId,
      durationSeconds,
      mountainId,
      mountainName,
    }: {
      sessionId: string;
      taskId: string;
      durationSeconds: number;
      mountainId: string;
      mountainName: string;
    }) => {
      setState((current) => {
        if (current.completedSessionIds.includes(sessionId)) return current;
        return {
          completedSessionIds: [
            ...current.completedSessionIds,
            sessionId,
          ].slice(-500),
          sessions: [
            ...current.sessions,
            {
              sessionId,
              taskId,
              mountainId,
              mountainName,
              durationSeconds,
              completedAt: new Date().toISOString(),
            },
          ].slice(-500),
          tasks: current.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  totalFocusSeconds: task.totalFocusSeconds + durationSeconds,
                  completedSessionCount: task.completedSessionCount + 1,
                  updatedAt: new Date().toISOString(),
                }
              : task,
          ),
        };
      });
      if (accountId && supabase) {
        void supabase.rpc("record_completed_task_focus_session", {
          p_session_id: sessionId,
          p_task_id: taskId,
          p_mountain_id: mountainId,
          p_duration_seconds: durationSeconds,
        });
      }
    },
    [accountId],
  );

  const reorderActiveTasks = useCallback(
    (taskIds: readonly string[]) => {
      setState((current) => ({
        ...current,
        tasks: current.tasks.map((task) => {
          const sortOrder = taskIds.indexOf(task.id);
          return sortOrder >= 0 ? { ...task, sortOrder } : task;
        }),
      }));
      if (accountId && supabase) {
        void supabase.rpc("reorder_active_tasks", { p_task_ids: [...taskIds] });
      }
    },
    [accountId],
  );

  return useMemo(
    () => ({
      tasks: state.tasks,
      sessions: state.sessions,
      hydrated,
      create,
      update,
      remove,
      recordCompletedSession,
      reorderActiveTasks,
    }),
    [
      create,
      hydrated,
      recordCompletedSession,
      reorderActiveTasks,
      remove,
      state.sessions,
      state.tasks,
      update,
    ],
  );
};
