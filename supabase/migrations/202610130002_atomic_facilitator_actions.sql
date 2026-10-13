create or replace function public.perform_futureslab_facilitator_action(
  p_action text,
  p_target_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session public.futureslab_sessions;
  v_inject public.futureslab_injects;
  v_evidence public.futureslab_evidence_requests;
  v_message public.futureslab_institutional_messages;
  v_session_id uuid;
begin
  if not public.is_futureslab_facilitator() then
    raise exception 'FACILITATOR_REQUIRED';
  end if;

  case p_action
    when 'UPDATE_SESSION' then
      if p_payload - array['status', 'current_stage', 'submissions_closed', 'remaining_seconds', 'clock_started_at'] <> '{}'::jsonb then
        raise exception 'FACILITATOR_ACTION_PAYLOAD_INVALID';
      end if;

      update public.futureslab_sessions
      set
        status = case when p_payload ? 'status' then (p_payload ->> 'status')::public.futureslab_session_status else status end,
        current_stage = case when p_payload ? 'current_stage' then (p_payload ->> 'current_stage')::integer else current_stage end,
        submissions_closed = case when p_payload ? 'submissions_closed' then (p_payload ->> 'submissions_closed')::boolean else submissions_closed end,
        remaining_seconds = case when p_payload ? 'remaining_seconds' then (p_payload ->> 'remaining_seconds')::integer else remaining_seconds end,
        clock_started_at = case when p_payload ? 'clock_started_at' then (p_payload ->> 'clock_started_at')::timestamptz else clock_started_at end
      where id = p_target_id
      returning * into v_session;

      if not found then raise exception 'SESSION_NOT_FOUND'; end if;

      insert into public.futureslab_activity_events(session_id, type, detail)
      values (v_session.id, 'FACILITATOR_SESSION_UPDATE', p_payload);

      return jsonb_build_object('id', v_session.id);

    when 'SEND_INJECT' then
      insert into public.futureslab_injects(session_id, title, body)
      values (p_target_id, trim(p_payload ->> 'title'), trim(p_payload ->> 'body'))
      returning * into v_inject;

      insert into public.futureslab_activity_events(session_id, type, detail)
      values (v_inject.session_id, 'FACILITATOR_INJECT_SENT', jsonb_build_object('title', v_inject.title));

      return jsonb_build_object('id', v_inject.id);

    when 'RELEASE_EVIDENCE' then
      update public.futureslab_evidence_requests
      set released_at = now()
      where id = p_target_id and released_at is null
      returning * into v_evidence;

      if not found then raise exception 'EVIDENCE_NOT_PENDING'; end if;

      insert into public.futureslab_activity_events(session_id, type, detail)
      values (
        v_evidence.session_id,
        'FACILITATOR_EVIDENCE_RELEASED',
        jsonb_build_object('evidenceId', v_evidence.evidence_id, 'requestId', v_evidence.id)
      );

      return jsonb_build_object('id', v_evidence.id);

    when 'ANSWER_INSTITUTIONAL_REQUEST' then
      update public.futureslab_institutional_messages
      set reply = trim(p_payload ->> 'reply'), status = 'ANSWERED', answered_at = now()
      where id = p_target_id and status = 'PENDING'
      returning * into v_message;

      if not found then raise exception 'INSTITUTIONAL_REQUEST_NOT_PENDING'; end if;

      insert into public.futureslab_activity_events(session_id, participant_id, type, detail)
      values (
        v_message.session_id,
        v_message.participant_id,
        'FACILITATOR_INSTITUTIONAL_REPLY',
        jsonb_build_object('institution', v_message.institution, 'messageId', v_message.id)
      );

      return jsonb_build_object('id', v_message.id);

    when 'REMOVE_PARTICIPANT' then
      select session_id into v_session_id
      from public.futureslab_participants
      where id = p_target_id
      for update;

      if not found then raise exception 'PARTICIPANT_NOT_FOUND'; end if;

      delete from public.futureslab_participants where id = p_target_id;

      insert into public.futureslab_activity_events(session_id, type, detail)
      values (
        v_session_id,
        'FACILITATOR_PARTICIPANT_REMOVED',
        jsonb_build_object('participantId', p_target_id, 'reason', 'INVALID_OR_DUPLICATE_REGISTRATION')
      );

      return jsonb_build_object('id', p_target_id);

    else
      raise exception 'FACILITATOR_ACTION_INVALID';
  end case;
end;
$$;

revoke all on function public.perform_futureslab_facilitator_action(text, uuid, jsonb) from public;
grant execute on function public.perform_futureslab_facilitator_action(text, uuid, jsonb) to authenticated;
