begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(7);

select has_function(
  'public',
  'perform_futureslab_facilitator_action',
  array['text', 'uuid', 'jsonb'],
  'the atomic facilitator action function has the expected signature'
);

insert into auth.users (id, email) values
  ('41111111-1111-1111-1111-111111111111', 'snguna@aiddata.wm.edu'),
  ('42222222-2222-2222-2222-222222222222', 'participant@example.org');

insert into public.futureslab_sessions (id, kind, status, join_code, created_by, expires_at)
values (
  '4aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'REHEARSAL',
  'LOBBY',
  'ATOMIC1',
  '41111111-1111-1111-1111-111111111111',
  now() + interval '1 day'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '41111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.email', 'snguna@aiddata.wm.edu', true);
select set_config('request.jwt.claims', '{"sub":"41111111-1111-1111-1111-111111111111","email":"snguna@aiddata.wm.edu"}', true);

select lives_ok(
  $$select public.perform_futureslab_facilitator_action(
    'UPDATE_SESSION',
    '4aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '{"status":"RUNNING"}'::jsonb
  )$$,
  'a facilitator session update succeeds'
);
select is(
  (select status::text from public.futureslab_sessions where id = '4aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'RUNNING',
  'the session mutation persists'
);
select is(
  (select count(*) from public.futureslab_activity_events where session_id = '4aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and type = 'FACILITATOR_SESSION_UPDATE'),
  1::bigint,
  'the required activity event persists with the mutation'
);

reset role;
create function public.fail_facilitator_action_event_for_test()
returns trigger
language plpgsql
as $$
begin
  if new.type = 'FACILITATOR_SESSION_UPDATE' then raise exception 'TEST_AUDIT_FAILURE'; end if;
  return new;
end;
$$;
create trigger fail_facilitator_action_event_for_test
before insert on public.futureslab_activity_events
for each row execute function public.fail_facilitator_action_event_for_test();

set local role authenticated;
select set_config('request.jwt.claim.sub', '41111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.email', 'snguna@aiddata.wm.edu', true);
select set_config('request.jwt.claims', '{"sub":"41111111-1111-1111-1111-111111111111","email":"snguna@aiddata.wm.edu"}', true);
select throws_ok(
  $$select public.perform_futureslab_facilitator_action(
    'UPDATE_SESSION',
    '4aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '{"status":"PAUSED"}'::jsonb
  )$$,
  'P0001',
  'TEST_AUDIT_FAILURE',
  'an activity-event failure rejects the facilitator action'
);
select is(
  (select status::text from public.futureslab_sessions where id = '4aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'RUNNING',
  'an activity-event failure rolls back the mutation'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '42222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claim.email', 'participant@example.org', true);
select set_config('request.jwt.claims', '{"sub":"42222222-2222-2222-2222-222222222222","email":"participant@example.org"}', true);
select throws_ok(
  $$select public.perform_futureslab_facilitator_action(
    'UPDATE_SESSION',
    '4aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '{"status":"PAUSED"}'::jsonb
  )$$,
  'P0001',
  'FACILITATOR_REQUIRED',
  'a participant cannot invoke a facilitator action'
);

select * from finish();
rollback;
