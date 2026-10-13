create or replace function public.join_futureslab_session(
  p_join_code text,
  p_name text,
  p_organization text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.futureslab_sessions;
  v_participant public.futureslab_participants;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 2
    or char_length(trim(coalesce(p_organization, ''))) < 2 then
    raise exception 'PROFILE_INCOMPLETE';
  end if;
  if lower(trim(coalesce(p_email, ''))) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'EMAIL_INVALID';
  end if;

  select * into v_session
  from public.futureslab_sessions
  where join_code = upper(trim(p_join_code))
    and status in ('LOBBY', 'RUNNING', 'PAUSED')
    and expires_at > now();
  if v_session.id is null then raise exception 'SESSION_NOT_AVAILABLE'; end if;

  insert into public.futureslab_participants(session_id, user_id, name, organization, email)
  values (v_session.id, v_user_id, trim(p_name), trim(p_organization), lower(trim(p_email)))
  on conflict (session_id, email) do update set
    name = excluded.name,
    organization = excluded.organization,
    last_active_at = now()
  where futureslab_participants.user_id = v_user_id
  returning * into v_participant;

  if v_participant.id is null then
    raise exception using errcode = 'P0001', message = 'PARTICIPANT_EMAIL_IN_USE';
  end if;

  insert into public.futureslab_activity_events(session_id, participant_id, type, detail)
  values (v_session.id, v_participant.id, 'PARTICIPANT_JOINED', jsonb_build_object('stage', v_session.current_stage));

  return jsonb_build_object('session', to_jsonb(v_session) - 'join_code' - 'created_by', 'participant', to_jsonb(v_participant));
end;
$$;

revoke all on function public.join_futureslab_session(text, text, text, text) from public;
grant execute on function public.join_futureslab_session(text, text, text, text) to authenticated;
