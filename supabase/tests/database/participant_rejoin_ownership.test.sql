begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'join_futureslab_session'),
  1::bigint,
  'only one join function signature exists'
);
select has_function(
  'public',
  'join_futureslab_session',
  array['text', 'text', 'text', 'text'],
  'the current join function has the expected signature'
);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'facilitator@example.org'),
  ('22222222-2222-2222-2222-222222222222', 'owner@example.org'),
  ('33333333-3333-3333-3333-333333333333', 'attacker@example.org');

insert into public.futureslab_sessions (id, kind, status, join_code, created_by, expires_at)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'REHEARSAL',
  'LOBBY',
  'REJOIN1',
  '11111111-1111-1111-1111-111111111111',
  now() + interval '1 day'
);

grant select on public.futureslab_participants to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

select lives_ok(
  $$select public.join_futureslab_session('REJOIN1', 'Original Owner', 'Owner Organization', 'owner@example.org')$$,
  'the first owner can join'
);
select is(
  (select count(*) from public.futureslab_participants where session_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1::bigint,
  'the first join creates one participant'
);
select is(
  (select user_id from public.futureslab_participants where session_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  '22222222-2222-2222-2222-222222222222'::uuid,
  'the participant belongs to the first owner'
);
select is(
  (public.join_futureslab_session('REJOIN1', 'Original Owner', 'Updated Organization', 'OWNER@example.org') -> 'participant' ->> 'id')::uuid,
  (select id from public.futureslab_participants where session_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'the same owner idempotently resumes the existing participant'
);
select is(
  (select count(*) from public.futureslab_participants where session_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1::bigint,
  'same-owner resume does not create a duplicate'
);

select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
select throws_ok(
  $$select public.join_futureslab_session('REJOIN1', 'Second Browser', 'Other Organization', 'owner@example.org')$$,
  'P0001',
  'PARTICIPANT_EMAIL_IN_USE',
  'a different owner receives only the bounded duplicate error'
);
select is(
  (select count(*) from public.futureslab_participants where session_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0::bigint,
  'the second owner cannot read the participant through RLS'
);

reset role;
select is(
  (select count(*) from public.futureslab_participants where session_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1::bigint,
  'the failed takeover leaves one participant row'
);
select is(
  (select user_id from public.futureslab_participants where session_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  '22222222-2222-2222-2222-222222222222'::uuid,
  'the failed takeover leaves ownership unchanged'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select is(
  (select count(*) from public.futureslab_participants where session_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1::bigint,
  'the original owner retains read access after the failed takeover'
);

select * from finish();
rollback;
