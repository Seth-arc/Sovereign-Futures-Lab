select cron.schedule(
  'futureslab-expired-sessions-daily',
  '10 seconds',
  $$delete from public.futureslab_sessions where expires_at <= now() and join_code = 'RETCRN14';$$
);

select cron.schedule(
  'futureslab-anonymous-users-daily',
  '10 seconds',
  $$delete from auth.users where is_anonymous is true and created_at < now() - interval '30 days' and raw_user_meta_data ->> 'futureslabRetentionGate' = '20261014';$$
);

do $$
declare
  v_creator_id uuid;
  v_user_id uuid;
  v_session_id uuid;
  v_participant_id uuid;
begin
  select created_by
  into strict v_creator_id
  from public.futureslab_sessions
  order by created_at
  limit 1;

  select u.id
  into strict v_user_id
  from auth.users u
  where u.is_anonymous is true
    and not exists (
      select 1
      from public.futureslab_participants p
      where p.user_id = u.id
    )
  order by u.created_at desc
  limit 1;

  insert into public.futureslab_sessions (
    title,
    kind,
    status,
    join_code,
    created_by,
    expires_at
  ) values (
    'Synthetic retention cron gate',
    'REHEARSAL',
    'CLOSED',
    'RETCRN14',
    v_creator_id,
    now() - interval '1 day'
  ) returning id into v_session_id;

  insert into public.futureslab_participants (
    session_id,
    user_id,
    name,
    organization,
    email
  ) values (
    v_session_id,
    v_user_id,
    'Synthetic retention participant',
    'Synthetic retention lab',
    'retention-gate-20261014@example.invalid'
  ) returning id into v_participant_id;

  insert into public.futureslab_activity_events (
    session_id,
    participant_id,
    type,
    detail
  ) values (
    v_session_id,
    v_participant_id,
    'RETENTION_GATE_SYNTHETIC',
    '{"synthetic":true,"gate":"20261014"}'::jsonb
  );

  update auth.users
  set
    created_at = now() - interval '31 days',
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || '{"futureslabRetentionGate":"20261014"}'::jsonb
  where id = v_user_id;
end;
$$;
