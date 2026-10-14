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

For a new project, choose exactly one migration method. Either preview and apply the complete chain with the CLI:

```powershell
npx supabase db push --dry-run
npx supabase db push
```

or run every file listed below once in the Supabase SQL editor in timestamp order. Do not use both methods on the same project.

The complete committed migration chain is:

1. `supabase/migrations/202609280001_futureslab.sql` creates the workshop schema, facilitator policies, participant RPC functions, Realtime publication, and cascade deletion rules.
2. `supabase/migrations/202610010001_freeze_submission_context.sql` adds the bounded submission context and replaces the submission RPC with the versioned atomic snapshot contract.
3. `supabase/migrations/202610130001_secure_participant_rejoin.sql` replaces the join RPC so an existing participant can be returned only to its original authenticated anonymous user.
4. `supabase/migrations/202610130002_atomic_facilitator_actions.sql` adds the scoped facilitator-action RPC so each operational mutation and its required activity event commit or roll back together.
5. `supabase/migrations/202610130003_authenticated_table_privileges.sql` grants the authenticated role only the table operations used by participant and facilitator clients; existing RLS policies continue to decide which rows each user may access.
6. `supabase/migrations/202610140001_retention_cron_jobs.sql` enables `pg_cron` and installs the two documented 30-day retention jobs with their production schedules.
7. `supabase/migrations/202610140002_retention_cron_rehearsal.sql` temporarily runs marker-scoped retention jobs against one synthetic expired session and one synthetic anonymous user.
8. `supabase/migrations/202610140003_restore_retention_cron_schedules.sql` immediately restores both jobs to their permanent daily schedules.
9. `supabase/migrations/202610140004_verify_retention_cron_rehearsal.sql` fails unless both synthetic records were deleted, both Cron runs succeeded, and both daily schedules are active.
10. `supabase/migrations/202610140005_persist_preparation_completion.sql` adds the nullable preparation-completion fact and its idempotent participant-owned RPC.

For an existing project, never edit or rerun the initial migration or any migration already recorded as applied. Export any required workshop reports, test the unapplied forward migrations against a disposable or rehearsal project, then run the dry run and apply those forward migrations in timestamp order outside a live workshop window. The snapshot migration deliberately leaves pre-existing `context_snapshot` values null; those rows must remain labeled `legacy · current-rule reconstruction`.

If the Supabase CLI is configured against a disposable local project, apply the full migration chain with `npx supabase db reset` before the linked-project dry run. Never use `db reset --linked`.

Verify the applied schema without changing data:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'futureslab_submissions'
  and column_name = 'context_snapshot';

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'futureslab_participants'
  and column_name = 'preparation_completed_at';

select p.proname, pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('join_futureslab_session', 'submit_futureslab_recommendation', 'perform_futureslab_facilitator_action', 'complete_futureslab_preparation')
order by p.proname, arguments;

select
  count(*) filter (where context_snapshot is null) as legacy_rows,
  count(*) filter (where context_snapshot is not null) as frozen_rows
from public.futureslab_submissions;

select
  version,
  submitted_at,
  context_snapshot ->> 'scenarioVersion' as scenario_version,
  context_snapshot ->> 'consequenceRuleVersion' as consequence_rule_version,
  context_snapshot -> 'availableEvidence' as available_evidence,
  context_snapshot -> 'facilitatorInjectIds' as facilitator_inject_ids,
  context_snapshot -> 'answeredInstitutionalMessageIds' as answered_message_ids,
  context_snapshot -> 'decisions' = decisions as decisions_match
from public.futureslab_submissions
where context_snapshot is not null
order by submitted_at desc
limit 5;
```

Pass means the nullable `jsonb` snapshot column and nullable `timestamptz` preparation column exist; the only join RPC signature is `join_futureslab_session(text, text, text, text)`; the only submission RPC signature is `submit_futureslab_recommendation(uuid, text, text)`; the facilitator-action RPC signature is `perform_futureslab_facilitator_action(text, uuid, jsonb)`; and the preparation RPC signature is `complete_futureslab_preparation(uuid)`. Existing submission snapshots remain null, and a new rehearsal submission has a non-null snapshot whose `submissionVersion`, `submittedAt`, and `decisions` match the containing row.

Run the disposable database tests after reset:

```powershell
npx supabase test db
npx supabase migration list
```

The participant rejoin test must confirm same-owner resume, one row per session/email, the exact bounded duplicate error, unchanged ownership, and RLS read access for the original owner only. Treat this as a mandatory manual gate when a disposable local Supabase stack is unavailable; a passing source-contract test alone is not sufficient.

The facilitator action database test must confirm that an activity-event failure rolls back its paired mutation and that a non-facilitator cannot invoke the RPC. Do not approve the release from the source-contract test alone when the disposable database gate has not run.

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
npx supabase secrets set GROQ_ADVISOR_TEXT_MODEL=openai/gpt-oss-120b
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
3. greet each advisor and confirm each gives a brief, natural, in-character greeting;
4. confirm Amara uses a measured explanatory cadence while Daniel uses a concise fact/boundary/implication cadence;
5. confirm each visible answer reveals progressively, then enable reduced motion at the operating-system level and confirm the complete answer appears immediately;
6. confirm Audio replies is off by default, preview both voices, and confirm no artificial pitch shift is applied while both complete transcripts remain visible;
7. repeat the voice check on the actual workshop browser and operating system because installed speech voices vary by device; if only legacy, novelty, non-English, or unknown generic voices are present, confirm audio is disabled and the text experience remains complete;
8. record a short microphone question and confirm an editable transcript is returned;
9. temporarily use an invalid provider key in rehearsal and confirm text falls back safely;
10. restore the correct key and confirm voice works again;
11. inspect Supabase Edge Function logs and confirm no secret, raw authorization token, or microphone file is logged.

Groq supplies advisor text and participant speech-to-text in this deployment. Spoken advisor replies are opt-in and use only recognized quality English voices from the browser's installed speech-synthesis catalogue. The application does not pitch-shift voices and disables audio when no suitable voice is available.

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

If authorized records are required after application deletion, download and open them first. Never make an export a prerequisite for an authorized privacy deletion.

Session deletion cascades through participant records, submissions, evidence requests, injects, institutional messages, advisor transcripts, and activity events. No in-platform session audit survives deletion; there is no separate durable deletion-audit surface in this deployment.

## 8. Review the privacy notice

Before collecting participant information, confirm the consent screen states that:

- consent version `2026-10-13` is used at both the landing producer and participant consumer;
- name, organization, email, and the first recorded Learning Bridge completion time; decisions, rationales, next institutional handoff, and versioned submissions; evidence requests, activity timestamps, facilitator updates, and institutional messages; advisor questions, answers, citations, and transfer reflection; and bounded replay metadata are retained for workshop delivery and debrief;
- the facilitator can access identified records and exports;
- microphone audio is sent to the configured external AI provider for transcription but is not stored by this application;
- advisor questions, recent advisor conversation, participant-visible scenario and evidence context, filtered working decisions, visible facilitator updates, answered institutional messages, and selected bounded research cards may be sent to the configured AI provider; the cards contain bounded claims, short verified excerpts, scope conditions, prohibited inferences, and citation metadata, not source files or full reports;
- application records are retained for up to 30 days and may be deleted earlier by the facilitator.

Confirm the selected Supabase region and AI provider terms are acceptable for AidData. Do not claim that all provider or backup copies are deleted in exactly 30 days unless the applicable provider terms guarantee that outcome.

Before production use of research-backed answers, the product owner must also confirm that the configured provider's processing and retention terms, together with each source's applicable rights, permit transfer of the approved bounded cards and short excerpts. Full-document provider processing remains blocked by `SG-005` in the source ledger.

**Current SG-005 status (2026-10-13): APPROVED_FOR_BOUNDED_PROVIDER_PROCESSING.** The product owner approved the configured Groq provider terms and applicable source rights for transferring only the bounded research-card fields and short excerpts defined by `SG-005`. Source files and full reports remain prohibited. This approval clears only the external-transfer gate; all other live-run gates remain independently required.

**Controlled provider gate (2026-10-13): PASSED with synthetic data.** Deployed `advisor-chat` version 6 returned an AI-mode answer with bounded citation metadata after its provider prompt was verified to omit session, participant, and user identifiers. Deployed `transcribe` version 1 returned a transcript for a locally generated synthetic speech sample. The disposable rehearsal session and all cascaded synthetic records were deleted after the checks; the temporary audio and browser artifacts were also removed. No secret values, real participant data, source files, or full report bodies were recorded or transferred.

## 9. Configure Vercel

Import the GitHub repository into Vercel, then choose the root that matches the imported layout:

- When `package.json` is at the imported repository root, use **Root Directory: leave blank**.
- Only when this application is the `futureslab` folder inside a larger imported repository, use **Root Directory: `futureslab`**.

The remaining settings are the same for either layout:

```text
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
7. Starting, pausing, resuming, sequential stage unlocking, injects, evidence release, institutional replies, and debrief closure update participants through Realtime. Browsing any facilitator cue card must not produce a participant update.
8. Advisor text, microphone transcription, scripted text fallback, and spoken browser playback work.
9. Each identified individual PDF, HTML, and JSON disclosure appears before its download, and each export opens correctly.
10. Anonymous workshop-comparison HTML/PDF contain no participant name, organization, email, or participant ID. Identified roster CSV and workshop JSON require their own facilitator-only disclosures and open correctly.
11. Refreshing a participant tab resumes the same participant record.
12. Closing and reopening the facilitator tab preserves the session data in Supabase.

Inspect browser, Vercel, Supabase Auth, Postgres, Realtime, and Edge Function logs while running this test.

## 11. Full functional rehearsal

Use a distinct `REHEARSAL` session. Never reuse it as the live session.

1. Verify the landing motion, theme switch, About modal, modal keyboard behavior, validation, consent, and workshop transition.
2. Verify all six About sections and the standalone `/about` route.
3. Verify Orientation opens automatically over the live room after initial sign-in. Complete Orientation only and confirm preparation remains **Not reported**; complete the Learning Bridge and confirm the facilitator preflight changes to **Preparation complete**. Replay both surfaces and refresh the participant browser; the first timestamp must remain unchanged. A legacy null remains **Not reported**. Starting casework with any not-reported participant requires acknowledgement but remains possible.
4. Verify locked stages read `Await facilitator`, and Mandate reopens the role brief.
5. Verify the top navigation, Glossary, theme control, Exit, Learning Bridge, and all six Case File tabs preserve participant work; confirm light mode uses the neutral-grey canvas and differentiated surfaces without pure-white fields.
6. Confirm only the Case File dossier content scrolls.
7. Confirm Communications opens as a full-page workspace without changing the current process stage and shows broadcasts, evidence status, requests, and replies.
8. Browse earlier and future facilitator cue cards and confirm participant access does not change. Then unlock each casework stage sequentially, confirm the button names the exact next stage, and confirm earlier participant work remains editable.
9. Request every evidence type and release at least one early.
10. Send every preset inject and answer an exceptional institutional request.
11. Verify both AI advisors, welcome playback, suggested questions, typed chat, push-to-talk, editable transcripts, spoken replies, and fallback behavior.
12. Ask a research-backed question and confirm its expandable Sources section shows the claim ID, source ID, source title, exact page reference, and source classification; confirm the same fields remain in the facilitator report.
13. Ask an ordinary process or contract question and confirm no policy-proposal source is retrieved. Then ask an explicit policy-reform question and confirm any policy source is labeled as a proposal.
14. Inspect the `advisor-chat` Edge Function logs for `advisor_retrieval_completed`; confirm the selected claim IDs come from the approved 21-card registry and never include `CLAIM-CF-PROGRESS-001` or `SRC-CF-PROGRESS`.
15. Run the research boundary checks: ask whether all Chinese loans are collateralized, whether signing an MoU creates cash relief, whether the World Bank statutory options are current law, and whether CoT is one haircut formula. Each answer must begin with "No" and show the expected structured Sources disclosure.
16. Ask a question that explicitly relies on `Progress debt treatments_CF.docx`. Confirm the answer reports a source gap, shows no source citation, and the Edge Function log records `advisor_research_boundary_returned` without an outbound model answer.
17. Inspect an AI-provider request in a controlled rehearsal environment and confirm it contains only selected bounded card fields and short excerpts, never a source file, repository path, PDF, DOCX, or full report body.
18. Submit version 1 before a delayed evidence item returns, allow it to return, change the working recommendation, and submit version 2. Confirm both remain selectable in the participant debrief and facilitator AAR; version 1 excludes the later evidence and retains its original decisions and consequences, while version 2 reflects its own frozen state.
19. Start, pause, and resume casework, then allow the clock to reach `00:00`. Confirm **Time expired** appears while submissions remain open and no debrief or closure happens automatically. Begin debrief with one participant unsubmitted and one `NOT_READY` or unresolved record; confirm the summary names participant and submission counts, current clock, and all three effects before the non-blocking transition. Confirm further submission is blocked only after debrief begins.
20. Export and open every individual and workshop-level format. Confirm HTML, PDF, CSV, and JSON name the selected submission version, scenario version, consequence-rule version, and either frozen or legacy replay provenance. Confirm every identified download is preceded by its personal-data and facilitator-only disclosure.
21. Search the anonymous group-comparison HTML and PDF for every test participant's name, organization, email, and participant ID; none may appear. Confirm the roster CSV and workshop JSON are visibly identified and are not governed by an anonymity switch.
22. Cancel closing once, then close deliberately and confirm submissions close, the clock stops, and participants become read-only while records remain. Attempt deletion with the wrong join code and confirm nothing changes; force a deletion failure and confirm the session remains selected. Then delete a disposable rehearsal with the exact code and confirm all related application records, including activity events, disappear and no in-platform session audit remains.
23. Verify local emergency mode separately and download its handoff file.
24. Compare the participant and facilitator shells with the preserved interface references at a 1440px Chrome or Edge viewport.
25. Confirm Escape, dialog focus trapping, focus return, keyboard-only operation, and no horizontal shell shift when opening or closing every modal workspace.

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

Cloud mode also has no verified cross-device recovery. The anonymous Supabase session in the original browser owns the participant row. Entering the same workshop code and email in a different browser must show the bounded recovery message, must not create a row or transfer ownership, and must not expose any participant record. The participant must return to the original browser or contact the facilitator.

### Facilitator freshness and action-failure gate

The console must show **Loading facilitator data**, **Live**, **Refreshing**, or **Data may be stale** as applicable, plus the last successful refresh time. Selected-session Realtime changes drive operational refresh, with a bounded 30-second reconciliation and an immediate refresh when a hidden tab becomes visible. A refresh failure must leave the last successful data visible and provide Retry. The sync indicator is intentionally not a polling live region. Operational refreshes exclude advisor transcripts and activity-event history; those detailed records and AAR construction occur only when the facilitator opens an AAR or requests an export.

Before release, throttle the network and switch quickly from session A to session B; confirm a late session-A response cannot replace B. Take Supabase offline and confirm the current dataset remains visible but stale, then restore connectivity and use Retry. Force clock, stage, debrief, inject, evidence-release, institutional-reply, participant-removal, close, and delete failures once. Confirm each matching control alone shows pending, double-clicks issue one request, failures show a bounded error without changing the current view, and unsent inject/reply drafts remain. After successful actions described as audited, confirm both the mutation and its activity event exist; neither may exist alone. Deletion is the exception: the confirmed cascade removes the session and its activity events, so no in-platform session audit survives.

For the facilitator lifecycle gate, join two participant browsers, unlock through Stage 4 while one participant remains in Stage 2, and browse cue cards 1, 3, 5, and 8. Neither participant may gain or lose access. Unlock the remaining casework stages one at a time and confirm each session update reaches both participants through Realtime. Let the clock expire, then deliberately pause or begin debrief; expiry itself must not close submissions. The debrief confirmation must remain available when participants are unsubmitted, `NOT_READY`, unresolved, or conditional.

### Participant ownership gate

Before approving a release:

1. create a disposable rehearsal session;
2. join in browser A and save a recognizable, non-sensitive test decision;
3. in a clean browser B, use the same join code and email;
4. confirm browser B is told to return to the original browser or contact the facilitator and cannot see browser A's data;
5. refresh browser A and confirm its original record remains available;
6. query the rehearsal data and confirm one participant row remains, owned by browser A's original `user_id`.

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
2. export and open any authorized facilitator reports required after deletion; skip this step when privacy deletion must proceed without making another copy;
3. close the live session;
4. retain it until exports are verified;
5. delete it early only if authorized, otherwise allow the 30-day jobs to purge it.

## 16. Final go/no-go gate

The workshop is ready only when all of these are true:

- tests, production build, and dependency audit pass from the committed release;
- the complete Supabase migration chain and both JWT-protected Edge Functions are deployed;
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
