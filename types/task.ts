export type TaskStatus = "active" | "completed" | "archived";

export type Task = {
  id: string;
  userId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  totalFocusSeconds: number;
  completedSessionCount: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
};

export type UpdateTaskInput = {
  title?: string;
  description?: string;
  status?: TaskStatus;
};

export type TaskFocusSession = {
  sessionId: string;
  taskId: string;
  mountainId: string;
  mountainName: string;
  durationSeconds: number;
  completedAt: string;
};
