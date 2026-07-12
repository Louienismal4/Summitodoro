create table if not exists public.hiker_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 40),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hiker_profiles enable row level security;

create policy "Users can read their own hiker profile"
  on public.hiker_profiles for select
  using (auth.uid() = id);

create policy "Users can create their own hiker profile"
  on public.hiker_profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own hiker profile"
  on public.hiker_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
