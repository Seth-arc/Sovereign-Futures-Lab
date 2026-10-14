alter table public.futureslab_participants
  add column if not exists preparation_completed_at timestamptz;

create or replace function public.complete_futureslab_preparation(p_participant_id uuid)
returns public.futureslab_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.futureslab_participants;
begin
  update public.futureslab_participants
  set preparation_completed_at = coalesce(preparation_completed_at, now()),
      last_active_at = now()
  where id = p_participant_id
    and user_id = auth.uid()
  returning * into v_participant;

  if not found then raise exception 'PARTICIPANT_NOT_FOUND'; end if;
  return v_participant;
end;
$$;

revoke all on function public.complete_futureslab_preparation(uuid) from public;
grant execute on function public.complete_futureslab_preparation(uuid) to authenticated;
