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

1. Open `/`, `/about`, `/workshop/`, and `/facilitator/` and confirm the browser tab uses the AidData Brandmark from `public/assets/AidData Brandmark.png`. Then confirm the original Sovereign landing entrance, topography motion, theme switch, About modal, modal keyboard controls, validation messages, and transition shield all work. Enter a name, organization, email address, workshop code, and consent once; confirm `/workshop/` joins automatically without showing a second form and that the browser address contains no participant details.
2. Open `/about` and confirm all six original slides respond to buttons, arrow keys, wheel, and touch gestures, then return home through its original transition.
3. Sign in at `/facilitator/` using the authorized email.
4. Create a **REHEARSAL** session and note its join code.
5. Join from at least three separate Chrome/Edge browser profiles.
6. Start and pause the clock.
7. Confirm the first participant entry opens Orientation transparently over the live room. While moving through Orientation, verify that the visible Process flow is the same eight-stage rail used after closing the modal—there must be no second seven-stage rail and no right-hand current-step guide. Confirm that locked stages read `Await facilitator` and that selecting Mandate reopens the role brief. In the participant top bar, confirm the enlarged `Sovereign` label has no role subtitle; open the hamburger and verify Glossary, the persisted light/dark control, and Exit are keyboard accessible. Confirm Glossary opens its dialog without losing work, and confirm Exit saves before returning to `/`. Reopen Orientation and Learning Bridge, open Case File from the top bar, and verify all six original case-file tabs remain functional without resetting participant work. In the Case File, confirm that only the dossier content has a scrollbar; the surrounding full-screen overlay must remain fixed.
8. From any participant stage, select the Communications icon. Confirm that the full-screen Communications workspace opens at the reference 150% scale, remains contained within one viewport, and does not change the selected process stage. Verify facilitator broadcasts, routine evidence-request status, returned evidence, exceptional requests, and facilitator replies appear there. Confirm Escape and the close button dismiss it and return keyboard focus to the Communications icon.
9. Unlock each stage and confirm participants retain earlier work.
10. Request every evidence type; release at least one early.
11. Broadcast each preset inject.
12. Send an exceptional institutional request, reply from the facilitator queue, and confirm the participant receives it.
13. Open AI Advisors and confirm it occupies the full viewport at 150% visual scale without creating an outer-page or advisor-brief scrollbar and without changing the selected process stage. Use the compact selector to inspect both advisors. Verify that each selected brief presents the professional biography before the advisory remit and that the complete welcome transcript is collapsed under `Read welcome transcript`. Expand each transcript, confirm either welcome can be spoken, and confirm closing restores focus to the AI Advisors control. Then test suggested questions, typed chat, push-to-talk, editable transcript, spoken answers, citations, provider failure fallback, and conversation-history scrolling after enough turns accumulate.
   - Confirm the advisor workspace does not display a readiness message, the `Participant-visible support` kicker, the advisor-selector instruction, or the `Grounded in visible case evidence` badge.
14. Submit two versions from one participant and confirm both appear in the AAR.
15. Begin debrief and confirm submissions close.
16. Inspect an individual AAR and export PDF, HTML, and JSON.
17. Preview an anonymized comparison and export HTML, roster CSV, and JSON.
18. Set `VITE_FORCE_LOCAL_MODE=true` in a local build and confirm an individual can complete the exercise and retain the record without cloud access.
19. Delete the rehearsal session and confirm all related data disappears.
20. Compare the participant shell with `docs/interface-references/kuvera_debt_management_office.html` and the facilitator shell with `docs/interface-references/facilitator_interface_v1.html` at a 1440px-wide Chrome or Edge viewport. Confirm the dark palette, Inter typography, AidData mark, Kuvera flag, advisor portraits, shell proportions, and facilitator navigation match before approving the rehearsal build.

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
