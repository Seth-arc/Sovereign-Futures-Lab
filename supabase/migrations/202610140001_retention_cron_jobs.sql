create extension if not exists pg_cron;

select cron.schedule(
  'futureslab-expired-sessions-daily',
  '15 3 * * *',
  $$delete from public.futureslab_sessions where expires_at <= now();$$
);

select cron.schedule(
  'futureslab-anonymous-users-daily',
  '25 3 * * *',
  $$delete from auth.users where is_anonymous is true and created_at < now() - interval '30 days';$$
);
