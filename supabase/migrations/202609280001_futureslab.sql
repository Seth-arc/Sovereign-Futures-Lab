create extension if not exists pgcrypto;

create type public.futureslab_session_kind as enum ('REHEARSAL', 'LIVE');
create type public.futureslab_session_status as enum ('DRAFT', 'LOBBY', 'RUNNING', 'PAUSED', 'DEBRIEF', 'CLOSED');

create or replace function public.is_futureslab_facilitator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'snguna@aiddata.wm.edu';
$$;

create table public.futureslab_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Kuvera Financing Assurances',
  kind public.futureslab_session_kind not null,
  status public.futureslab_session_status not null default 'DRAFT',
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{6,12}$'),
  current_stage integer not null default 0 check (current_stage between 0 and 7),
  duration_seconds integer not null default 1200 check (duration_seconds between 300 and 7200),
  remaining_seconds integer not null default 1200 check (remaining_seconds >= 0),
  clock_started_at timestamptz,
  submissions_closed boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

create table public.futureslab_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.futureslab_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  organization text not null check (char_length(organization) between 2 and 160),
  email text not null check (char_length(email) between 3 and 254),
  current_stage integer not null default 0 check (current_stage between 0 and 7),
  decisions jsonb not null default '{}'::jsonb,
  submission_version integer not null default 0,
  consented_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  unique (session_id, email)
);

create table public.futureslab_evidence_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.futureslab_sessions(id) on delete cascade,
  participant_id uuid not null references public.futureslab_participants(id) on delete cascade,
  evidence_id text not null,
  requested_at timestamptz not null default now(),
  available_at timestamptz not null,
  released_at timestamptz,
  unique (participant_id, evidence_id)
);

create table public.futureslab_submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.futureslab_sessions(id) on delete cascade,
  participant_id uuid not null references public.futureslab_participants(id) on delete cascade,
  version integer not null check (version > 0),
  decisions jsonb not null,
  submitted_at timestamptz not null default now(),
  unique (participant_id, version)
);

create table public.futureslab_injects (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.futureslab_sessions(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 160),
  body text not null check (char_length(body) between 2 and 2000),
  sent_at timestamptz not null default now()
);

create table public.futureslab_institutional_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.futureslab_sessions(id) on delete cascade,
  participant_id uuid not null references public.futureslab_participants(id) on delete cascade,
  institution text not null check (institution in ('TREASURY', 'LEGAL', 'OCC', 'IMF', 'CREDITOR')),
  question text not null check (char_length(question) between 2 and 2000),
  reply text check (reply is null or char_length(reply) between 2 and 4000),
  status text not null default 'PENDING' check (status in ('PENDING', 'ANSWERED')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  check ((status = 'PENDING' and reply is null and answered_at is null) or (status = 'ANSWERED' and reply is not null and answered_at is not null))
);

create table public.futureslab_advisor_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.futureslab_sessions(id) on delete cascade,
  participant_id uuid not null references public.futureslab_participants(id) on delete cascade,
  advisor_id text not null check (advisor_id in ('amara', 'daniel')),
  question text not null check (char_length(question) between 1 and 2000),
  answer text not null check (char_length(answer) between 1 and 8000),
  sources jsonb not null default '[]'::jsonb,
  mode text not null check (mode in ('AI', 'SCRIPTED_FALLBACK')),
  created_at timestamptz not null default now()
);

create table public.futureslab_activity_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.futureslab_sessions(id) on delete cascade,
  participant_id uuid references public.futureslab_participants(id) on delete cascade,
  type text not null check (char_length(type) between 2 and 100),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index futureslab_participants_session_idx on public.futureslab_participants(session_id);
create index futureslab_evidence_participant_idx on public.futureslab_evidence_requests(participant_id);
create index futureslab_messages_session_status_idx on public.futureslab_institutional_messages(session_id, status, created_at);
create index futureslab_events_session_time_idx on public.futureslab_activity_events(session_id, created_at);
create index futureslab_advisor_participant_idx on public.futureslab_advisor_turns(participant_id, created_at);

alter table public.futureslab_sessions enable row level security;
alter table public.futureslab_participants enable row level security;
alter table public.futureslab_evidence_requests enable row level security;
alter table public.futureslab_submissions enable row level security;
alter table public.futureslab_injects enable row level security;
alter table public.futureslab_institutional_messages enable row level security;
alter table public.futureslab_advisor_turns enable row level security;
alter table public.futureslab_activity_events enable row level security;

create policy sessions_facilitator_all on public.futureslab_sessions
  for all using (public.is_futureslab_facilitator()) with check (public.is_futureslab_facilitator());
create policy sessions_participant_read on public.futureslab_sessions
  for select using (exists (
    select 1 from public.futureslab_participants p
    where p.session_id = futureslab_sessions.id and p.user_id = auth.uid()
  ));

create policy participants_facilitator_all on public.futureslab_participants
  for all using (public.is_futureslab_facilitator()) with check (public.is_futureslab_facilitator());
create policy participants_self_read on public.futureslab_participants
  for select using (user_id = auth.uid());

create policy evidence_facilitator_all on public.futureslab_evidence_requests
  for all using (public.is_futureslab_facilitator()) with check (public.is_futureslab_facilitator());
create policy evidence_self_read on public.futureslab_evidence_requests
  for select using (exists (
    select 1 from public.futureslab_participants p
    where p.id = participant_id and p.user_id = auth.uid()
  ));

create policy submissions_facilitator_all on public.futureslab_submissions
  for all using (public.is_futureslab_facilitator()) with check (public.is_futureslab_facilitator());
create policy submissions_self_read on public.futureslab_submissions
  for select using (exists (
    select 1 from public.futureslab_participants p
    where p.id = participant_id and p.user_id = auth.uid()
  ));
create policy injects_facilitator_all on public.futureslab_injects
  for all using (public.is_futureslab_facilitator()) with check (public.is_futureslab_facilitator());
create policy injects_participant_read on public.futureslab_injects
  for select using (exists (
    select 1 from public.futureslab_participants p
    where p.session_id = futureslab_injects.session_id and p.user_id = auth.uid()
  ));

create policy messages_facilitator_all on public.futureslab_institutional_messages
  for all using (public.is_futureslab_facilitator()) with check (public.is_futureslab_facilitator());
create policy messages_self_read on public.futureslab_institutional_messages
  for select using (exists (
    select 1 from public.futureslab_participants p
    where p.id = participant_id and p.user_id = auth.uid()
  ));
create policy messages_self_insert on public.futureslab_institutional_messages
  for insert with check (
    status = 'PENDING' and reply is null and answered_at is null and exists (
      select 1 from public.futureslab_participants p
      where p.id = participant_id and p.session_id = futureslab_institutional_messages.session_id and p.user_id = auth.uid()
    )
  );

create policy advisor_facilitator_read on public.futureslab_advisor_turns
  for select using (public.is_futureslab_facilitator());
create policy advisor_self_read on public.futureslab_advisor_turns
  for select using (exists (
    select 1 from public.futureslab_participants p
    where p.id = participant_id and p.user_id = auth.uid()
  ));
create policy advisor_self_insert_fallback on public.futureslab_advisor_turns
  for insert with check (
    mode = 'SCRIPTED_FALLBACK' and exists (
      select 1 from public.futureslab_participants p
      where p.id = participant_id and p.session_id = futureslab_advisor_turns.session_id and p.user_id = auth.uid()
    )
  );

create policy events_facilitator_read on public.futureslab_activity_events
  for select using (public.is_futureslab_facilitator());
create policy events_facilitator_insert on public.futureslab_activity_events
  for insert with check (public.is_futureslab_facilitator());
create policy events_self_read on public.futureslab_activity_events
  for select using (exists (
    select 1 from public.futureslab_participants p
    where p.id = participant_id and p.user_id = auth.uid()
  ));
create policy events_self_insert on public.futureslab_activity_events
  for insert with check (exists (
    select 1 from public.futureslab_participants p
    where p.id = participant_id and p.user_id = auth.uid()
  ));

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
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(trim(p_name)) < 2 or char_length(trim(p_organization)) < 2 then
    raise exception 'PROFILE_INCOMPLETE';
  end if;
  if lower(trim(p_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'EMAIL_INVALID';
  end if;
  select * into v_session
  from public.futureslab_sessions
  where join_code = upper(trim(p_join_code))
    and status in ('LOBBY', 'RUNNING', 'PAUSED')
    and expires_at > now();
  if v_session.id is null then raise exception 'SESSION_NOT_AVAILABLE'; end if;

  insert into public.futureslab_participants(session_id, user_id, name, organization, email)
  values (v_session.id, auth.uid(), trim(p_name), trim(p_organization), lower(trim(p_email)))
  on conflict (session_id, email) do update set
    user_id = auth.uid(),
    name = excluded.name,
    organization = excluded.organization,
    last_active_at = now()
  returning * into v_participant;

  insert into public.futureslab_activity_events(session_id, participant_id, type, detail)
  values (v_session.id, v_participant.id, 'PARTICIPANT_JOINED', jsonb_build_object('stage', v_session.current_stage));

  return jsonb_build_object('session', to_jsonb(v_session) - 'join_code' - 'created_by', 'participant', to_jsonb(v_participant));
end;
$$;

grant execute on function public.join_futureslab_session(text, text, text, text) to authenticated;

create or replace function public.save_futureslab_decisions(
  p_participant_id uuid,
  p_decisions jsonb,
  p_current_stage integer
)
returns public.futureslab_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.futureslab_participants;
begin
  if jsonb_typeof(p_decisions) <> 'object' or p_current_stage not between 0 and 7 then
    raise exception 'DECISION_STATE_INVALID';
  end if;
  select p.* into v_participant
  from public.futureslab_participants p
  join public.futureslab_sessions s on s.id = p.session_id
  where p.id = p_participant_id
    and p.user_id = auth.uid()
    and s.status <> 'CLOSED'
    and p_current_stage <= greatest(s.current_stage, p.current_stage);
  if v_participant.id is null then raise exception 'DECISION_SAVE_NOT_ALLOWED'; end if;
  update public.futureslab_participants
  set decisions = p_decisions, current_stage = greatest(current_stage, p_current_stage), last_active_at = now()
  where id = v_participant.id
  returning * into v_participant;
  return v_participant;
end;
$$;

grant execute on function public.save_futureslab_decisions(uuid, jsonb, integer) to authenticated;

create or replace function public.request_futureslab_evidence(
  p_participant_id uuid,
  p_evidence_id text
)
returns public.futureslab_evidence_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.futureslab_participants;
  v_request public.futureslab_evidence_requests;
  v_delay integer;
begin
  v_delay := case p_evidence_id
    when 'treasury-reconciliation' then 35
    when 'account-control' then 45
    when 'facility-a' then 30
    when 'facility-b' then 55
    when 'cross-collateralization' then 65
    when 'confidentiality-opinion' then 50
    when 'creditor-status' then 70
    when 'occ-request' then 25
    when 'imf-clarification' then 40
    else null
  end;
  if v_delay is null then raise exception 'EVIDENCE_UNKNOWN'; end if;
  select p.* into v_participant
  from public.futureslab_participants p
  join public.futureslab_sessions s on s.id = p.session_id
  where p.id = p_participant_id and p.user_id = auth.uid() and s.status <> 'CLOSED';
  if v_participant.id is null then raise exception 'EVIDENCE_REQUEST_NOT_ALLOWED'; end if;
  select * into v_request from public.futureslab_evidence_requests
  where participant_id = v_participant.id and evidence_id = p_evidence_id;
  if v_request.id is not null then return v_request; end if;
  insert into public.futureslab_evidence_requests(session_id, participant_id, evidence_id, available_at)
  values (v_participant.session_id, v_participant.id, p_evidence_id, now() + make_interval(secs => v_delay))
  returning * into v_request;
  return v_request;
end;
$$;

grant execute on function public.request_futureslab_evidence(uuid, text) to authenticated;

create or replace function public.submit_futureslab_recommendation(p_participant_id uuid)
returns public.futureslab_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.futureslab_participants;
  v_submission public.futureslab_submissions;
begin
  select p.* into v_participant
  from public.futureslab_participants p
  join public.futureslab_sessions s on s.id = p.session_id
  where p.id = p_participant_id and p.user_id = auth.uid() and not s.submissions_closed
  for update of p;
  if v_participant.id is null then raise exception 'SUBMISSION_NOT_ALLOWED'; end if;
  update public.futureslab_participants
  set submission_version = submission_version + 1, last_active_at = now()
  where id = v_participant.id
  returning * into v_participant;
  insert into public.futureslab_submissions(session_id, participant_id, version, decisions)
  values (v_participant.session_id, v_participant.id, v_participant.submission_version, v_participant.decisions)
  returning * into v_submission;
  insert into public.futureslab_activity_events(session_id, participant_id, type, detail)
  values (v_participant.session_id, v_participant.id, 'RECOMMENDATION_SUBMITTED', jsonb_build_object('version', v_submission.version));
  return v_submission;
end;
$$;

grant execute on function public.submit_futureslab_recommendation(uuid) to authenticated;

create or replace function public.purge_expired_futureslab_sessions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  if not public.is_futureslab_facilitator() then raise exception 'FACILITATOR_REQUIRED'; end if;
  delete from public.futureslab_sessions where expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.purge_expired_futureslab_sessions() to authenticated;

alter publication supabase_realtime add table
  public.futureslab_sessions,
  public.futureslab_participants,
  public.futureslab_evidence_requests,
  public.futureslab_injects,
  public.futureslab_institutional_messages,
  public.futureslab_submissions;
