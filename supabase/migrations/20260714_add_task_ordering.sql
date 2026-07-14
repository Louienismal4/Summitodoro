alter table public.tasks
  add column if not exists sort_order integer not null default 0 check (sort_order >= 0);

with ordered_tasks as (
  select id, row_number() over (partition by user_id order by created_at) - 1 as position
  from public.tasks
)
update public.tasks
set sort_order = ordered_tasks.position
from ordered_tasks
where public.tasks.id = ordered_tasks.id
  and public.tasks.sort_order = 0;

create or replace function public.reorder_active_tasks(p_task_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to reorder tasks';
  end if;

  if exists (
    select 1
    from unnest(p_task_ids) as ordered_task(id)
    left join public.tasks on public.tasks.id = ordered_task.id
    where public.tasks.user_id is distinct from auth.uid()
      or public.tasks.status <> 'active'
  ) then
    raise exception 'Only your active tasks can be reordered';
  end if;

  update public.tasks
  set sort_order = ordered_task.position - 1,
      updated_at = now()
  from unnest(p_task_ids) with ordinality as ordered_task(id, position)
  where public.tasks.id = ordered_task.id
    and public.tasks.user_id = auth.uid();
end;
$$;

revoke all on function public.reorder_active_tasks(uuid[]) from public;
grant execute on function public.reorder_active_tasks(uuid[]) to authenticated;
