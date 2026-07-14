create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 1000),
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  total_focus_seconds bigint not null default 0 check (total_focus_seconds >= 0),
  completed_session_count integer not null default 0 check (completed_session_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists tasks_user_status_updated_at_idx
  on public.tasks (user_id, status, updated_at desc);

create table if not exists public.task_focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  session_id uuid not null,
  mountain_id text not null references public.mountains (id),
  duration_seconds integer not null check (duration_seconds between 60 and 10800),
  completed_at timestamptz not null default now(),
  unique (user_id, session_id)
);

create index if not exists task_focus_sessions_task_completed_at_idx
  on public.task_focus_sessions (task_id, completed_at desc);

alter table public.tasks enable row level security;
alter table public.task_focus_sessions enable row level security;

create policy "Users can read their own tasks"
  on public.tasks for select using (auth.uid() = user_id);

create policy "Users can create their own tasks"
  on public.tasks for insert with check (auth.uid() = user_id);

create policy "Users can update their own tasks"
  on public.tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their own tasks"
  on public.tasks for delete using (auth.uid() = user_id);

create policy "Users can read their own task focus sessions"
  on public.task_focus_sessions for select using (auth.uid() = user_id);

create or replace function public.record_completed_task_focus_session(
  p_session_id uuid,
  p_task_id uuid,
  p_mountain_id text,
  p_duration_seconds integer
)
returns table (
  recorded boolean,
  total_focus_seconds bigint,
  completed_session_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  task_row public.tasks%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to record task focus';
  end if;
  if p_duration_seconds < 60 or p_duration_seconds > 10800 then
    raise exception 'Focus duration must be between 1 minute and 3 hours';
  end if;

  select * into task_row
  from public.tasks
  where id = p_task_id and user_id = auth.uid()
  for update;
  if not found then
    raise exception 'Task was not found';
  end if;

  if exists (
    select 1 from public.task_focus_sessions
    where user_id = auth.uid() and session_id = p_session_id
  ) then
    recorded := false;
    total_focus_seconds := task_row.total_focus_seconds;
    completed_session_count := task_row.completed_session_count;
    return next;
    return;
  end if;

  insert into public.task_focus_sessions (
    user_id, task_id, session_id, mountain_id, duration_seconds
  ) values (
    auth.uid(), p_task_id, p_session_id, p_mountain_id, p_duration_seconds
  );

  update public.tasks
  set
    total_focus_seconds = public.tasks.total_focus_seconds + p_duration_seconds,
    completed_session_count = public.tasks.completed_session_count + 1,
    updated_at = now()
  where id = p_task_id
  returning public.tasks.total_focus_seconds, public.tasks.completed_session_count
    into total_focus_seconds, completed_session_count;

  recorded := true;
  return next;
end;
$$;

revoke all on function public.record_completed_task_focus_session(uuid, uuid, text, integer) from public;
grant execute on function public.record_completed_task_focus_session(uuid, uuid, text, integer) to authenticated;
