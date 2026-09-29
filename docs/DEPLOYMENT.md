# Futureslab deployment and rehearsal runbook

This is the complete deployment process for the workshop application in this repository. The intentionally small production architecture is:

- GitHub for source control;
- Vercel for the static Vite application;
- one Supabase project for Postgres, authentication, Row Level Security, Realtime, Cron, and Edge Functions;
- one primary external AI provider for advisor text and speech transcription;
- browser-generated facilitator reports, with no file-storage service.

The application does not require a separate API server or Supabase Storage bucket. Microphone audio is sent directly to the transcription function and is not written to application storage.

## 1. Accounts and ownership

Create or confirm accounts for:

1. GitHub;
2. Vercel;
3. Supabase;
4. Groq or OpenAI;
5. an SMTP provider if reliable facilitator magic-link delivery is required.

Keep ownership under the facilitator or the responsible AidData account. Enable multi-factor authentication wherever available. Do not share service-role keys, AI keys, database passwords, or personal access tokens.

The only authorized facilitator email in the database policy is:

```text
snguna@aiddata.wm.edu
```

Changing that address requires a reviewed database migration. Do not edit the production policy directly in the Supabase dashboard.

## 2. Prepare and publish the repository

Run these commands from the repository root, where `package.json` is located:

```powershell
npm ci
npm test
npm run build
npm audit --omit=dev
git status
```

Pass criteria:

- all tests pass;
- TypeScript and Vite complete the production build;
- the production dependency audit has no high or critical vulnerability;
- no `.env.local`, API key, participant export, generated report, or database password is staged.

Commit and push the verified source:

```powershell
git add .
git commit -m "Prepare Futureslab workshop deployment"
git push
```

Do not commit:

- `.env.local`;
- Groq or OpenAI keys;
- Supabase service-role or secret keys;
- participant CSV, JSON, HTML, or PDF exports;
- downloaded database backups.

## 3. Create and link Supabase

1. Create one Supabase project in an approved data region.
2. Record the project reference and database password in an approved password manager.
3. From the repository root, authenticate and link the local project:

```powershell
npx supabase --version
npx supabase login
npx supabase projects list
npx supabase link --project-ref YOUR_PROJECT_REF
```

Preview and apply the committed migration:

```powershell
npx supabase db push --dry-run
npx supabase db push
```

The migration `supabase/migrations/202609280001_futureslab.sql` creates the workshop schema, facilitator policies, participant RPC functions, Realtime publication, and cascade deletion rules. Use either `db push` or the Supabase SQL editor for the initial migration, not both.

After migration:

- open Database > Tables and confirm Row Level Security is enabled on every `futureslab_*` table;
- open Database > Publications and confirm the intended workshop tables are in `supabase_realtime`;
- run Supabase Security Advisor and resolve any high-severity finding before rehearsal.

Do not use `db reset --linked`. It is destructive and is not part of this deployment.

## 4. Configure authentication

In Supabase Authentication:

1. Enable anonymous sign-ins for participants.
2. Enable email passwordless sign-in for the facilitator.
3. Set the production Site URL to the final Vercel URL or custom domain.
4. Add exact redirect URLs for:
   - `http://localhost:5173/facilitator` during local testing;
   - the production `/facilitator` route;
   - each Vercel preview URL used for rehearsal.
5. Confirm that an authenticated account other than `snguna@aiddata.wm.edu` cannot read or change facilitator data.

### Participant sign-in capacity

Supabase anonymous sign-ins are rate-limited by source IP. A venue may place all laptops behind one public IP. Set the anonymous sign-in limit above the planned attendance with rehearsal headroom; for 50 participants, configure at least 60 joins per hour from one IP and confirm the current project limit in the dashboard.

Keep the production join code private. If the public URL will be widely distributed, add CAPTCHA or Turnstile before the event rather than relying only on the join code.

### Facilitator email delivery

For a rehearsal-only deployment, the facilitator address must at minimum be a member of the Supabase project team so the default mail service can deliver to it. For workshop reliability, configure custom SMTP and send a real facilitator magic link before approving the deployment.

Keep a facilitator session authenticated on the dedicated facilitator laptop before participants arrive. Do not treat an already-open session as a substitute for testing email delivery.

## 5. Configure the AI provider

The Edge Functions support Groq or OpenAI. Configure one primary provider so provider selection is unambiguous.

### Groq primary

```powershell
npx supabase secrets set GROQ_API_KEY=replace_me
npx supabase secrets set GROQ_ADVISOR_TEXT_MODEL=replace_with_a_model_enabled_for_your_account
npx supabase secrets set GROQ_TRANSCRIPTION_MODEL=whisper-large-v3-turbo
```

### OpenAI primary

```powershell
npx supabase secrets set OPENAI_API_KEY=replace_me
npx supabase secrets set OPENAI_ADVISOR_TEXT_MODEL=replace_with_an_available_model
npx supabase secrets set OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
```

Confirm the configured names in the provider dashboard because model availability and rate limits change. Never place AI keys in `VITE_*` variables.

If both provider keys are configured, the current functions always choose Groq first. They do not automatically retry OpenAI after a Groq request fails. Switching providers therefore requires removing or disabling the Groq secret in the Supabase dashboard and testing again.

The scripted fallback protects text-advisor use when the AI text request fails. It does not transcribe audio. Because voice is required, the primary provider must support the expected burst of workshop transcription requests. Confirm a rate limit of at least the expected simultaneous voice requests or deliberately stagger voice use during facilitation.

Verify the configured secret names without exposing their values:

```powershell
npx supabase secrets list
```

## 6. Deploy and test the Edge Functions

The committed `supabase/config.toml` requires a valid Supabase JWT for both functions. Do not deploy with `--no-verify-jwt`.

Deploy:

```powershell
npx supabase functions deploy advisor-chat
npx supabase functions deploy transcribe
```

Then test through the application with a real participant session:

1. ask each advisor a grounded question;
2. confirm the response is recorded for the facilitator report;
3. record a short microphone question and confirm an editable transcript is returned;
4. temporarily use an invalid provider key in rehearsal and confirm text falls back safely;
5. restore the correct key and confirm voice works again;
6. inspect Supabase Edge Function logs and confirm no secret, raw authorization token, or microphone file is logged.

Supabase automatically supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to hosted Edge Functions. Do not copy the service-role key into Vercel.

## 7. Configure 30-day retention

Enable Supabase Cron under Integrations > Cron. Create two daily database jobs.

### Delete expired workshop sessions

Name: `futureslab-expired-sessions-daily`

Schedule: `15 3 * * *`

SQL:

```sql
delete from public.futureslab_sessions
where expires_at <= now();
```

Cascade rules remove participants, evidence requests, submissions, injects, institutional messages, advisor transcripts, and activity events for each expired session.

### Delete expired anonymous Auth users

Name: `futureslab-anonymous-users-daily`

Schedule: `25 3 * * *`

SQL:

```sql
delete from auth.users
where is_anonymous is true
  and created_at < now() - interval '30 days';
```

This second job is necessary because deleting workshop sessions does not automatically delete anonymous Supabase Auth accounts. It does not delete the facilitator account.

After creating the jobs:

- run each once with rehearsal data or a controlled expired test record;
- confirm cascade deletion behaves as intended;
- inspect Cron History for success;
- confirm both jobs remain active before the live workshop.

Do not delete a live session early until all required facilitator exports have been downloaded and opened successfully.

## 8. Review the privacy notice

Before collecting participant information, confirm the consent screen states that:

- name, organization, email, decisions, activity, messages, advisor transcripts, and reflections are collected for workshop delivery and debrief;
- the facilitator can access identified records and exports;
- microphone audio is sent to the configured external AI provider for transcription but is not stored by this application;
- advisor questions and relevant participant-visible scenario context may be sent to the configured AI provider;
- application records are retained for up to 30 days and may be deleted earlier by the facilitator.

Confirm the selected Supabase region and AI provider terms are acceptable for AidData. Do not claim that all provider or backup copies are deleted in exactly 30 days unless the applicable provider terms guarantee that outcome.

## 9. Configure Vercel

Import the GitHub repository into Vercel.

Because `package.json`, `vite.config.ts`, and `vercel.json` are at the repository root, use:

```text
Root Directory: leave blank
Framework Preset: Vite
Install Command: npm ci
Build Command: npm run build
Output Directory: dist
```

Set these variables in both Preview and Production where appropriate:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_FORCE_LOCAL_MODE=false`

The browser-safe anonymous or publishable key may be exposed to the browser because Row Level Security is enabled. Never add the service-role key or AI-provider keys to Vercel.

After adding or changing variables, redeploy. Confirm the production deployment uses the intended commit. If a custom domain is added later, update the Supabase Site URL and redirect allow-list before using it.

The committed `vercel.json` provides route rewrites and security headers. Confirm those headers are present on the deployed site rather than assuming the configuration was applied.

## 10. Production URL smoke test

Test the deployed URL in current Chrome and Edge using normal and private browser profiles.

Required checks:

1. `/`, `/about`, `/workshop/`, and `/facilitator/` load directly and after refresh.
2. The AidData site icon and required image assets load without console errors.
3. The participant consent handoff contains no personal information in the URL.
4. A valid join code works and an invalid code fails safely.
5. An unauthorized facilitator email cannot access workshop records.
6. The authorized facilitator receives a magic link and can create a rehearsal session.
7. Starting, pausing, stage unlocking, injects, evidence release, institutional replies, and debrief closure update participants through Realtime.
8. Advisor text, microphone transcription, scripted text fallback, and spoken browser playback work.
9. Individual PDF, HTML, and JSON exports open correctly.
10. Workshop comparison HTML, roster CSV, and JSON exports open correctly.
11. Refreshing a participant tab resumes the same participant record.
12. Closing and reopening the facilitator tab preserves the session data in Supabase.

Inspect browser, Vercel, Supabase Auth, Postgres, Realtime, and Edge Function logs while running this test.

## 11. Full functional rehearsal

Use a distinct `REHEARSAL` session. Never reuse it as the live session.

1. Verify the landing motion, theme switch, About modal, modal keyboard behavior, validation, consent, and workshop transition.
2. Verify all six About sections and the standalone `/about` route.
3. Verify Orientation opens over the live room and uses the same eight-stage process rail as the exercise.
4. Verify locked stages read `Await facilitator`, and Mandate reopens the role brief.
5. Verify the top navigation, Glossary, theme control, Exit, Learning Bridge, and all six Case File tabs preserve participant work.
6. Confirm only the Case File dossier content scrolls.
7. Confirm Communications opens as a full-page workspace without changing the current process stage and shows broadcasts, evidence status, requests, and replies.
8. Unlock every stage and confirm earlier participant work remains editable.
9. Request every evidence type and release at least one early.
10. Send every preset inject and answer an exceptional institutional request.
11. Verify both AI advisors, welcome playback, suggested questions, typed chat, push-to-talk, editable transcripts, spoken replies, and fallback behavior.
12. Confirm participant chat does not display citation chips while source references remain in the facilitator report.
13. Submit at least two recommendation versions and confirm both remain in the AAR.
14. Begin debrief and confirm further submission is blocked.
15. Export and open every individual and workshop-level format.
16. Preview the anonymized projected comparison while identified reports remain facilitator-only.
17. Delete a disposable rehearsal session and confirm related application records disappear.
18. Verify local emergency mode separately and download its handoff file.
19. Compare the participant and facilitator shells with the preserved interface references at a 1440px Chrome or Edge viewport.
20. Confirm Escape, dialog focus trapping, focus return, and keyboard-only operation on every modal workspace.

## 12. Capacity rehearsal for 20–50 participants

Before workshop approval, run one rehearsal from the expected venue network or a network with equivalent shared-IP behavior.

Pass criteria:

- at least the expected participant count can sign in within the planned arrival window;
- no participant is blocked by anonymous-auth rate limits;
- the facilitator sees all participants and their current stages;
- stage changes and injects reach all connected devices;
- concurrent saves and submissions do not create duplicate or lost records;
- advisor and transcription request limits are understood and fit the facilitation plan;
- the facilitator console remains responsive;
- the venue network remains stable with all laptops connected.

A three-browser smoke test is not a substitute for this capacity rehearsal.

## 13. Failure and fallback rehearsal

Test these cases intentionally in the rehearsal session:

- Groq or OpenAI unavailable: typed advisor questions use the scripted fallback;
- transcription unavailable: participants can edit or type the question manually;
- Supabase temporarily unavailable: explain that synchronized facilitation is unavailable and use local emergency mode only if the facilitator chooses to continue;
- participant refresh or accidental tab closure: participant resumes from browser storage and the persisted record;
- facilitator refresh: the console reloads the active session from Supabase;
- venue internet failure: participants switch to local emergency mode and download handoff files at completion.

Local emergency mode is individual and browser-local. It does not provide facilitator monitoring, Realtime synchronization, cloud transcription, or automatic cross-device recovery.

## 14. Monitoring and rollback

During rehearsal and the live workshop, keep open:

- Vercel deployment and runtime logs;
- Supabase Auth logs;
- Supabase database and Realtime logs;
- Supabase Edge Function logs;
- the AI provider usage and rate-limit dashboard.

For an application regression, use Vercel to redeploy the last verified production deployment. Do not apply a new database migration during the live workshop.

Before any future schema change:

1. export required workshop reports;
2. confirm the available Supabase backup for the selected plan;
3. test the migration against rehearsal data;
4. run `npx supabase db push --dry-run`;
5. schedule the change outside the workshop window.

The initial migration is the deployment baseline. Do not attempt an improvised destructive rollback of the database on workshop day.

## 15. Workshop-day checklist

At least 24 hours before:

- confirm the Supabase project is active and not paused;
- confirm the Vercel production URL and exact commit;
- confirm the facilitator magic link works;
- confirm AI provider status, model access, quota, and spending limit;
- confirm Cron jobs are active;
- export or remove rehearsal records as intended;
- create a new `LIVE` session and keep its join code private.

Before admitting participants:

- test one participant laptop from the venue network;
- confirm Chrome or Edge, microphone permission, headphones, and stable Wi-Fi;
- sign in on the dedicated facilitator laptop and prevent it from sleeping;
- keep a second authorized browser profile available as a facilitator backup;
- confirm the scripted advisor fallback and emergency handoff instructions are available.

After the workshop:

1. begin debrief and close submissions;
2. export and open all required facilitator reports and the roster CSV;
3. close the live session;
4. retain it until exports are verified;
5. delete it early only if authorized, otherwise allow the 30-day jobs to purge it.

## 16. Final go/no-go gate

The workshop is ready only when all of these are true:

- tests, production build, and dependency audit pass from the committed release;
- the Supabase migration and both JWT-protected Edge Functions are deployed;
- RLS and unauthorized-access checks pass;
- facilitator email delivery works;
- anonymous sign-in capacity supports the venue network;
- AI text and voice capacity supports the facilitation plan;
- both retention jobs have completed successfully at least once;
- privacy wording accurately describes external AI processing;
- the production smoke test, full functional rehearsal, capacity rehearsal, and fallback rehearsal pass;
- exports, monitoring, and rollback procedures have been exercised;
- the facilitator approves the exact production URL and commit.

If any item is unverified, record it as an open blocker rather than assuming it will work during the workshop.

## Reference links

- Supabase CLI workflow: https://supabase.com/docs/guides/local-development/cli-workflows
- Supabase Edge Function deployment: https://supabase.com/docs/guides/functions/deploy
- Supabase anonymous authentication: https://supabase.com/docs/guides/auth/auth-anonymous
- Supabase SMTP: https://supabase.com/docs/guides/auth/auth-smtp
- Supabase Cron: https://supabase.com/docs/guides/cron
- Supabase production checklist: https://supabase.com/docs/guides/deployment/going-into-prod
- Vercel build configuration: https://vercel.com/docs/builds
- Groq model availability: https://console.groq.com/docs/models
- Groq rate limits: https://console.groq.com/docs/rate-limits
