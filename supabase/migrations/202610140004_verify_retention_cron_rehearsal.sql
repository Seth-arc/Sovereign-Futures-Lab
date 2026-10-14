do $$
begin
  if exists (
    select 1 from public.futureslab_sessions where join_code = 'RETCRN14'
  ) or exists (
    select 1
    from public.futureslab_participants
    where email = 'retention-gate-20261014@example.invalid'
  ) or exists (
    select 1
    from public.futureslab_activity_events
    where type = 'RETENTION_GATE_SYNTHETIC'
      and detail ->> 'gate' = '20261014'
  ) then
    raise exception 'Expired-session retention rehearsal records were not deleted';
  end if;

  if exists (
    select 1
    from auth.users
    where raw_user_meta_data ->> 'futureslabRetentionGate' = '20261014'
  ) then
    raise exception 'Anonymous-user retention rehearsal record was not deleted';
  end if;

  if not exists (
    select 1
    from cron.job_run_details run
    join cron.job job on job.jobid = run.jobid
    where job.jobname = 'futureslab-expired-sessions-daily'
      and run.status = 'succeeded'
      and run.start_time >= now() - interval '15 minutes'
  ) then
    raise exception 'No successful expired-session retention Cron run was recorded';
  end if;

  if not exists (
    select 1
    from cron.job_run_details run
    join cron.job job on job.jobid = run.jobid
    where job.jobname = 'futureslab-anonymous-users-daily'
      and run.status = 'succeeded'
      and run.start_time >= now() - interval '15 minutes'
  ) then
    raise exception 'No successful anonymous-user retention Cron run was recorded';
  end if;

  if not exists (
    select 1
    from cron.job
    where jobname = 'futureslab-expired-sessions-daily'
      and schedule = '15 3 * * *'
      and active
  ) or not exists (
    select 1
    from cron.job
    where jobname = 'futureslab-anonymous-users-daily'
      and schedule = '25 3 * * *'
      and active
  ) then
    raise exception 'Retention Cron jobs were not restored to their daily schedules';
  end if;
end;
$$;
