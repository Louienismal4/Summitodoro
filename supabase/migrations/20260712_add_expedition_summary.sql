alter table public.hiker_profiles
  add column if not exists xp integer not null default 0 check (xp >= 0),
  add column if not exists total_focus_minutes integer not null default 0 check (total_focus_minutes >= 0),
  add column if not exists completed_summits integer not null default 0 check (completed_summits >= 0),
  add column if not exists focus_chain integer not null default 0 check (focus_chain >= 0),
  add column if not exists completed_session_ids jsonb not null default '[]'::jsonb;
