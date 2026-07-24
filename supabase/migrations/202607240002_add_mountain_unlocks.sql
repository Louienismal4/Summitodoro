-- Depends on the mountains and currency tables created by the prior migration.
create table if not exists public.user_mountain_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.hiker_profiles (id) on delete cascade,
  mountain_id text not null references public.mountains (id) on delete restrict,
  unlocked_at timestamptz not null default now(),
  unlock_cost integer not null check (unlock_cost >= 0),
  unlock_method text not null default 'currency' check (
    unlock_method in ('currency', 'default')
  ),
  created_at timestamptz not null default now(),
  unique (user_id, mountain_id)
);

alter table public.user_mountain_unlocks enable row level security;

create policy "Users can read their own mountain unlocks"
  on public.user_mountain_unlocks for select
  using (auth.uid() = user_id);

create or replace function public.unlock_mountain(p_mountain_id text)
returns table (
  mountain_id text,
  unlocked boolean,
  already_unlocked boolean,
  spent integer,
  remaining_trail_coins integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row public.hiker_profiles%rowtype;
  mountain_row public.mountains%rowtype;
  current_level integer;
  applied_cost integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to unlock a mountain';
  end if;

  -- Serialize unlock attempts for one user before checking their balance or
  -- existing unlocks, so concurrent requests cannot spend twice.
  select * into profile_row
  from public.hiker_profiles
  where id = auth.uid()
  for update;
  if not found then
    raise exception 'Hiker profile was not found';
  end if;

  select * into mountain_row
  from public.mountains
  where id = p_mountain_id;
  if not found then
    raise exception 'Mountain was not found';
  end if;

  mountain_id := mountain_row.id;
  select exists(
    select 1
    from public.user_mountain_unlocks
    where user_id = auth.uid() and user_mountain_unlocks.mountain_id = p_mountain_id
  ) into already_unlocked;
  if already_unlocked then
    unlocked := true;
    spent := 0;
    remaining_trail_coins := profile_row.trail_coins;
    return next;
    return;
  end if;

  -- Keep database eligibility aligned with the existing client level model.
  current_level := floor(profile_row.xp / 500) + 1;
  if current_level < mountain_row.required_level then
    raise exception 'Level % is required to unlock %', mountain_row.required_level, mountain_row.id
      using errcode = 'P0001';
  end if;

  applied_cost := case when mountain_row.is_default_unlocked then 0 else mountain_row.unlock_cost end;
  if profile_row.trail_coins < applied_cost then
    raise exception 'Insufficient Trail Coins to unlock %', mountain_row.id
      using errcode = 'P0001';
  end if;

  update public.hiker_profiles
  set
    trail_coins = trail_coins - applied_cost,
    lifetime_trail_coins_spent = lifetime_trail_coins_spent + applied_cost,
    updated_at = now()
  where id = auth.uid()
  returning trail_coins into remaining_trail_coins;

  insert into public.user_mountain_unlocks (
    user_id,
    mountain_id,
    unlock_cost,
    unlock_method
  )
  values (
    auth.uid(),
    mountain_row.id,
    applied_cost,
    case when mountain_row.is_default_unlocked then 'default' else 'currency' end
  );

  if applied_cost > 0 then
    insert into public.currency_transactions (
      user_id,
      amount,
      transaction_type,
      reference_type,
      reference_id,
      description,
      balance_after
    )
    values (
      auth.uid(),
      -applied_cost,
      'mountain_unlock',
      'mountain',
      mountain_row.id,
      format('Unlocked %s', mountain_row.id),
      remaining_trail_coins
    );
  end if;

  unlocked := true;
  already_unlocked := false;
  spent := applied_cost;
  return next;
end;
$$;

revoke all on function public.unlock_mountain(text) from public;
grant execute on function public.unlock_mountain(text) to authenticated;
