create or replace function public.purge_expired_task_history()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.tasks
  where status in ('completed', 'archived')
    and coalesce(completed_at, updated_at) < now() - interval '30 days';
end;
$$;

revoke all on function public.purge_expired_task_history() from public;
grant execute on function public.purge_expired_task_history() to authenticated;
