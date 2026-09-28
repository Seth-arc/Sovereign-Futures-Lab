# Deployment and rehearsal runbook

This runbook intentionally uses one Vercel application and one Supabase project. It does not require a separate API server.

## 1. Accounts and repository

1. Create a GitHub repository and place this workspace in it.
2. Create a Supabase project in the region approved for workshop data.
3. Create a Vercel project from the GitHub repository and set its root directory to `futureslab`.
4. Do not commit `.env.local`, provider keys, the Supabase service-role key, participant exports, or generated reports.

## 2. Database and authentication

1. Open the Supabase SQL editor.
2. Run `supabase/migrations/202609280001_futureslab.sql` once.
3. In Authentication > Providers, enable:
   - email OTP for the facilitator;
   - anonymous sign-ins for participants.
4. In Authentication > URL Configuration, set the production Site URL and add the Vercel preview URLs used for rehearsal.
5. Confirm that only `snguna@aiddata.wm.edu` passes the facilitator policies.

### Automatic 30-day purge

Use Supabase Cron to run this SQL once daily:

```sql
delete from public.futureslab_sessions where expires_at <= now();
```

Run it as a database job, not through a browser client. Cascade rules remove participant records, evidence and institutional requests, submissions, injects, advisor transcripts, and activity events with the expired session.

## 3. AI provider

The functions prefer Groq when both providers are configured. Configure either provider; configuring both gives an operator-controlled alternative.

```powershell
supabase secrets set GROQ_API_KEY=replace_me
supabase secrets set GROQ_ADVISOR_TEXT_MODEL=replace_with_an_available_model
supabase secrets set GROQ_TRANSCRIPTION_MODEL=whisper-large-v3-turbo
```

Optional OpenAI alternative:

```powershell
supabase secrets set OPENAI_API_KEY=replace_me
supabase secrets set OPENAI_ADVISOR_TEXT_MODEL=replace_with_an_available_model
supabase secrets set OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
```

Provider model availability and pricing change. Confirm the chosen model in the provider's current dashboard before rehearsal. Never put these keys in `VITE_*` variables.

Deploy functions:

```powershell
supabase functions deploy advisor-chat
supabase functions deploy transcribe
```

## 4. Vercel variables

Set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_FORCE_LOCAL_MODE=false`

The Supabase anonymous key is designed for browser use when row-level security is enabled. The service-role key and AI keys are server-only Supabase secrets.

No Storage bucket is required for the first workshop. Reports are generated in the facilitator's browser, and microphone audio is never persisted.

## 5. Rehearsal sequence

1. Open `/` and confirm the original Sovereign landing entrance, topography motion, theme switch, About modal, modal keyboard controls, validation messages, and transition shield all work. Enter a name, organization, email address, workshop code, and consent once; confirm `/workshop/` joins automatically without showing a second form and that the browser address contains no participant details.
2. Open `/about` and confirm all six original slides respond to buttons, arrow keys, wheel, and touch gestures, then return home through its original transition.
3. Sign in at `/facilitator/` using the authorized email.
4. Create a **REHEARSAL** session and note its join code.
5. Join from at least three separate Chrome/Edge browser profiles.
6. Start and pause the clock.
7. Unlock each stage and confirm participants retain earlier work.
8. Request every evidence type; release at least one early.
9. Broadcast each preset inject.
10. Send an exceptional institutional request, reply from the facilitator queue, and confirm the participant receives it.
11. Test typed advisor chat, push-to-talk, editable transcript, spoken answer, and provider failure fallback.
12. Submit two versions from one participant and confirm both appear in the AAR.
13. Begin debrief and confirm submissions close.
14. Inspect an individual AAR and export PDF, HTML, and JSON.
15. Preview an anonymized comparison and export HTML, roster CSV, and JSON.
16. Set `VITE_FORCE_LOCAL_MODE=true` in a local build and confirm an individual can complete the exercise and retain the record without cloud access.
17. Delete the rehearsal session and confirm all related data disappears.
18. Compare the participant shell with `docs/interface-references/kuvera_debt_management_office.html` and the facilitator shell with `docs/interface-references/facilitator_interface_v1.html` at a 1440px-wide Chrome or Edge viewport. Confirm the dark palette, Inter typography, AidData mark, Kuvera flag, advisor portraits, shell proportions, and facilitator navigation match before approving the rehearsal build.

## 6. Workshop-day checks

- Use a distinct **LIVE** session; never reuse rehearsal data.
- Confirm Chrome or Edge, microphone permission, headphones, and stable Wi-Fi.
- Keep the join code off public channels.
- Open the facilitator console on a dedicated laptop and prevent it from sleeping.
- Test one participant device before admitting the room.
- Keep the scripted advisor fallback enabled.
- Export facilitator reports before deleting a live session early.

## Human-run verification

The coding agent has not run these commands:

```powershell
cd futureslab
npm install
npm test
npm run build
npm audit --omit=dev
```

Pass means all deterministic tests succeed, Vite produces a production build, and the production dependency audit reports zero known vulnerabilities. A large lazy PDF chunk may still produce a Vite advisory, but it is loaded only when the facilitator requests a PDF and is not part of the initial participant bundle.

For a production-like smoke test after deployment, verify participant join, realtime stage progression, evidence timing, AI failure fallback, versioned submission, debrief closure, all export formats, and unauthorized access denial.
