alter table public.futureslab_submissions
  add column context_snapshot jsonb;

alter table public.futureslab_submissions
  add constraint futureslab_submission_context_snapshot_bounded check (
    context_snapshot is null
    or (
      jsonb_typeof(context_snapshot) = 'object'
      and context_snapshot ->> 'schemaVersion' = '1'
      and jsonb_typeof(context_snapshot -> 'decisions') = 'object'
      and context_snapshot -> 'decisions' = decisions
      and context_snapshot ->> 'submissionVersion' = version::text
      and context_snapshot ->> 'submittedAt' = to_jsonb(submitted_at) #>> '{}'
      and nullif(context_snapshot ->> 'scenarioVersion', '') is not null
      and nullif(context_snapshot ->> 'consequenceRuleVersion', '') is not null
      and case
        when jsonb_typeof(context_snapshot -> 'availableEvidence') = 'array'
          then jsonb_array_length(context_snapshot -> 'availableEvidence') <= 32
        else false
      end
      and case
        when jsonb_typeof(context_snapshot -> 'facilitatorInjectIds') = 'array'
          then jsonb_array_length(context_snapshot -> 'facilitatorInjectIds') <= 100
        else false
      end
      and case
        when jsonb_typeof(context_snapshot -> 'answeredInstitutionalMessageIds') = 'array'
          then jsonb_array_length(context_snapshot -> 'answeredInstitutionalMessageIds') <= 100
        else false
      end
      and pg_column_size(context_snapshot) <= 262144
    )
  );

revoke execute on function public.submit_futureslab_recommendation(uuid) from authenticated;
drop function public.submit_futureslab_recommendation(uuid);

create function public.submit_futureslab_recommendation(
  p_participant_id uuid,
  p_scenario_version text,
  p_consequence_rule_version text
)
returns public.futureslab_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.futureslab_participants;
  v_submission public.futureslab_submissions;
  v_submitted_at timestamptz;
  v_available_evidence jsonb;
  v_inject_ids jsonb;
  v_message_ids jsonb;
  v_context_snapshot jsonb;
  v_available_evidence_count integer;
  v_inject_count integer;
  v_message_count integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if trim(coalesce(p_scenario_version, '')) <> 'kuvera-financing-assurances-2026-10-01'
    or trim(coalesce(p_consequence_rule_version, '')) <> 'kuvera-consequence-rules-2026-10-01' then
    raise exception 'SUBMISSION_VERSION_INVALID';
  end if;

  select p.* into v_participant
  from public.futureslab_participants p
  join public.futureslab_sessions s on s.id = p.session_id
  where p.id = p_participant_id
    and p.user_id = auth.uid()
    and not s.submissions_closed
  for update of p, s;
  if v_participant.id is null then raise exception 'SUBMISSION_NOT_ALLOWED'; end if;
  if jsonb_typeof(v_participant.decisions) <> 'object' then raise exception 'DECISION_STATE_INVALID'; end if;
  v_submitted_at := clock_timestamp();

  select count(*) into v_available_evidence_count
  from public.futureslab_evidence_requests er
  where er.participant_id = v_participant.id
    and er.session_id = v_participant.session_id
    and er.requested_at <= v_submitted_at
    and (er.available_at <= v_submitted_at or er.released_at <= v_submitted_at);

  select count(*) into v_inject_count
  from public.futureslab_injects i
  where i.session_id = v_participant.session_id and i.sent_at <= v_submitted_at;

  select count(*) into v_message_count
  from public.futureslab_institutional_messages m
  where m.participant_id = v_participant.id
    and m.session_id = v_participant.session_id
    and m.status = 'ANSWERED'
    and m.answered_at <= v_submitted_at;

  if v_available_evidence_count > 32 or v_inject_count > 100 or v_message_count > 100 then
    raise exception 'SUBMISSION_CONTEXT_LIMIT_EXCEEDED';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'requestId', er.id::text,
    'evidenceId', er.evidence_id,
    'requestedAt', er.requested_at,
    'availableAt', er.available_at,
    'releasedAt', er.released_at
  ) order by er.evidence_id, er.id), '[]'::jsonb)
  into v_available_evidence
  from public.futureslab_evidence_requests er
  where er.participant_id = v_participant.id
    and er.session_id = v_participant.session_id
    and er.requested_at <= v_submitted_at
    and (er.available_at <= v_submitted_at or er.released_at <= v_submitted_at);

  select coalesce(jsonb_agg(i.id::text order by i.sent_at, i.id), '[]'::jsonb)
  into v_inject_ids
  from public.futureslab_injects i
  where i.session_id = v_participant.session_id and i.sent_at <= v_submitted_at;

  select coalesce(jsonb_agg(m.id::text order by m.answered_at, m.id), '[]'::jsonb)
  into v_message_ids
  from public.futureslab_institutional_messages m
  where m.participant_id = v_participant.id
    and m.session_id = v_participant.session_id
    and m.status = 'ANSWERED'
    and m.answered_at <= v_submitted_at;

  update public.futureslab_participants
  set submission_version = submission_version + 1, last_active_at = v_submitted_at
  where id = v_participant.id
  returning * into v_participant;

  v_context_snapshot := jsonb_build_object(
    'schemaVersion', 1,
    'scenarioVersion', trim(p_scenario_version),
    'consequenceRuleVersion', trim(p_consequence_rule_version),
    'submissionVersion', v_participant.submission_version,
    'submittedAt', v_submitted_at,
    'decisions', v_participant.decisions,
    'availableEvidence', v_available_evidence,
    'facilitatorInjectIds', v_inject_ids,
    'answeredInstitutionalMessageIds', v_message_ids
  );

  insert into public.futureslab_submissions(
    session_id,
    participant_id,
    version,
    decisions,
    submitted_at,
    context_snapshot
  ) values (
    v_participant.session_id,
    v_participant.id,
    v_participant.submission_version,
    v_participant.decisions,
    v_submitted_at,
    v_context_snapshot
  ) returning * into v_submission;

  insert into public.futureslab_activity_events(session_id, participant_id, type, detail)
  values (
    v_participant.session_id,
    v_participant.id,
    'RECOMMENDATION_SUBMITTED',
    jsonb_build_object(
      'version', v_submission.version,
      'scenarioVersion', trim(p_scenario_version),
      'consequenceRuleVersion', trim(p_consequence_rule_version),
      'contextSnapshot', 'FROZEN'
    )
  );
  return v_submission;
end;
$$;

revoke all on function public.submit_futureslab_recommendation(uuid, text, text) from public;
grant execute on function public.submit_futureslab_recommendation(uuid, text, text) to authenticated;
