-- Add the currency ledger before mountain unlocks reference it.
alter table public.hiker_profiles
  add column if not exists trail_coins integer not null default 0 check (trail_coins >= 0),
  add column if not exists lifetime_trail_coins_earned bigint not null default 0
    check (lifetime_trail_coins_earned >= 0),
  add column if not exists lifetime_trail_coins_spent bigint not null default 0
    check (lifetime_trail_coins_spent >= 0);

create table if not exists public.mountains (
  id text primary key,
  required_level integer not null default 1 check (required_level >= 1),
  unlock_cost integer not null default 0 check (unlock_cost >= 0),
  is_default_unlocked boolean not null default false
);

insert into public.mountains (id, required_level, unlock_cost, is_default_unlocked)
values
  ('mt-pinatubo', 1, 0, true),
  ('mt-ulap', 3, 500, false),
  ('mt-pulag', 5, 1200, false)
on conflict (id) do update set
  required_level = excluded.required_level,
  unlock_cost = excluded.unlock_cost,
  is_default_unlocked = excluded.is_default_unlocked;

create table if not exists public.currency_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.hiker_profiles (id) on delete cascade,
  amount integer not null check (amount <> 0),
  transaction_type text not null check (
    transaction_type in (
      'session_reward',
      'daily_bonus',
      'first_summit_bonus',
      'mountain_unlock',
      'admin_adjustment',
      'refund'
    )
  ),
  reference_type text,
  reference_id text,
  description text,
  balance_after integer not null check (balance_after >= 0),
  created_at timestamptz not null default now()
);

create unique index if not exists currency_transactions_session_reward_once
  on public.currency_transactions (user_id, reference_id)
  where transaction_type = 'session_reward' and reference_type = 'focus_session';

alter table public.mountains enable row level security;
alter table public.currency_transactions enable row level security;

create policy "Anyone can read mountain progression requirements"
  on public.mountains for select using (true);

create policy "Users can read their own currency transactions"
  on public.currency_transactions for select
  using (auth.uid() = user_id);

create or replace function public.claim_completed_focus_session(
  p_session_id uuid,
  p_duration_minutes integer,
  p_checkpoint_count integer,
  p_difficulty text
)
returns table (
  awarded boolean,
  focus_xp integer,
  checkpoint_xp integer,
  summit_xp integer,
  total_xp integer,
  trail_coins integer,
  balance_after integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row public.hiker_profiles%rowtype;
  existing_transaction public.currency_transactions%rowtype;
  difficulty_multiplier numeric;
  v_trail_coins integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to claim a session reward';
  end if;

  if p_duration_minutes < 1 or p_duration_minutes > 180 then
    raise exception 'Focus duration must be between 1 and 180 minutes';
  end if;

  if p_checkpoint_count < 0 or p_checkpoint_count > 20 then
    raise exception 'Checkpoint count is outside the allowed range';
  end if;

  difficulty_multiplier := case p_difficulty
    when 'easy' then 0.8
    when 'moderate' then 1
    when 'hard' then 1.4
    else null
  end;
  if difficulty_multiplier is null then
    raise exception 'Invalid mountain difficulty';
  end if;

  -- Locking the profile before the idempotency lookup serializes concurrent
  -- completion claims for the same user and prevents a duplicate balance update.
  select * into profile_row
  from public.hiker_profiles
  where id = auth.uid()
  for update;
  if not found then
    raise exception 'Hiker profile was not found';
  end if;

  focus_xp := floor(p_duration_minutes * 10 * difficulty_multiplier)::integer;
  checkpoint_xp := floor(p_checkpoint_count * 25 * difficulty_multiplier)::integer;
  summit_xp := floor(50 * difficulty_multiplier)::integer;
  total_xp := round(focus_xp + checkpoint_xp + summit_xp)::integer;
  v_trail_coins := p_duration_minutes * 2;
  trail_coins := v_trail_coins;

  select * into existing_transaction
  from public.currency_transactions
  where user_id = auth.uid()
    and transaction_type = 'session_reward'
    and reference_type = 'focus_session'
    and reference_id = p_session_id::text;

  if found then
    awarded := false;
    balance_after := existing_transaction.balance_after;
    return next;
    return;
  end if;

  update public.hiker_profiles
  set
    xp = xp + total_xp,
    total_focus_minutes = total_focus_minutes + p_duration_minutes,
    completed_summits = completed_summits + 1,
    focus_chain = focus_chain + 1,
    completed_session_ids = (
      select coalesce(jsonb_agg(value order by ordinality), '[]'::jsonb)
      from (
        select value, ordinality
        from jsonb_array_elements(profile_row.completed_session_ids || to_jsonb(p_session_id::text))
          with ordinality
        order by ordinality desc
        limit 100
      ) recent
    ),
    trail_coins = public.hiker_profiles.trail_coins + v_trail_coins,
    lifetime_trail_coins_earned = lifetime_trail_coins_earned + v_trail_coins,
    updated_at = now()
  where id = auth.uid()
  returning trail_coins into balance_after;

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
    trail_coins,
    'session_reward',
    'focus_session',
    p_session_id::text,
    format('Completed %s-minute focus session', p_duration_minutes),
    balance_after
  );

  awarded := true;
  return next;
end;
$$;

revoke all on function public.claim_completed_focus_session(uuid, integer, integer, text)
  from public;
grant execute on function public.claim_completed_focus_session(uuid, integer, integer, text)
  to authenticated;
