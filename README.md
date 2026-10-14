# Sovereign Room Futureslab

Workshop-focused demo for **A Data-Informed Simulation for African Foresight Practice**.

The application deliberately implements a bounded slice of the Sovereign Room method:

1. role and authority orientation;
2. role-visible evidence and uncertainty;
3. structured decisions with written rationale;
4. deterministic consequences;
5. an immutable submission history;
6. facilitator-led causal debrief and counterfactual review.

Routine evidence requests use authored responses and delays. A deliberately small exception desk lets the facilitator answer unusual requests in the voice of Treasury, Legal, the IMF, the Official Creditor Committee, or a creditor—without adding a general messaging system.

It is not a replacement for the full Sovereign Room platform. The participant surface follows the preserved `docs/interface-references/kuvera_debt_management_office.html`, and the facilitator surface follows `facilitator_interface_v1.html`, as visual sources of truth. Their dark interface palette, Inter typography, shell geometry, AidData brandmark, Kuvera flag, institutional marks, and Amara/Daniel portraits are carried into the maintained React experience. Required image assets live under `public/assets` and `public/img`; immutable source references live under `docs/interface-references` and are not executed at runtime. Application scenario content is owned by `src/scenario.ts`. Each deployable page loads Inter with an ordered stylesheet link to the same Google Fonts endpoint used by the references, avoiding late CSS imports, and falls back to the reference system-font stack if that endpoint is unavailable.

Supabase Storage is intentionally not required for this workshop slice: microphone audio is discarded after transcription, and reports are regenerated from retained records and downloaded directly to the facilitator's device. This removes an unnecessary file-retention surface.

## Facilitator delivery sequence

Plan for approximately **6 minutes of participant preparation**, **20 minutes of timed casework**, and **10–12 minutes of debrief and transfer**. Preparation covers Orientation and the Learning Bridge outside the casework clock. During casework, the Live overview presents one concise cue card for the current stage: its learning purpose, opening question, listen-for cues, misconception, discussion-based unlock condition, and debrief connection. Unlock a stage when the stated discussion or decision condition is present, not merely because a participant has visited the preceding stage or time has elapsed.

Selecting **Begin debrief** requires confirmation because it closes submissions, pauses the casework clock, and opens the participant debrief. The facilitator then reconstructs the submission-time evidence state, compares decision pathways without ranking, discusses one fictional consequence, runs one counterfactual while naming its fixed assumptions, and asks participants what they will transfer to real decision preparation.

## Runtime surfaces

- `/` — exact Sovereign landing reference, including its topography motion engine, theme control, login transition, and integrated six-section About modal
- `/about` or `/about.html` — complete standalone About presentation with its original motion and navigation
- `/workshop/` — Debt Management Office exercise; the landing modal is the single participant identity and consent gate, this route consumes its one-time browser handoff automatically, and Orientation opens after every successful sign-in
- Orientation, the Learning Bridge, and the six-section Case File are native surfaces inside `/workshop/`; the historical seven-stage reference is documentation-only
- `/facilitator/` — passwordless facilitator console, restricted to `snguna@aiddata.wm.edu`

## Local setup

Run commands from the application root: the directory that contains `package.json`. In this standalone repository, that is the repository root. If this application is copied into a larger repository as `futureslab`, change into that nested folder first.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

For offline UI rehearsal, set `VITE_FORCE_LOCAL_MODE=true`. Local mode keeps each participant's data only in that browser. It does not provide facilitator monitoring or cross-device synchronization.

## Cloud setup

The canonical procedure is the [deployment and rehearsal runbook](docs/DEPLOYMENT.md). Follow it rather than treating this overview as a separate deployment process.

The complete committed migration chain is:

1. `supabase/migrations/202609280001_futureslab.sql`
2. `supabase/migrations/202610010001_freeze_submission_context.sql`
3. `supabase/migrations/202610130001_secure_participant_rejoin.sql`
4. `supabase/migrations/202610130002_atomic_facilitator_actions.sql`
5. `supabase/migrations/202610130003_authenticated_table_privileges.sql`
6. `supabase/migrations/202610140001_retention_cron_jobs.sql`
7. `supabase/migrations/202610140002_retention_cron_rehearsal.sql`
8. `supabase/migrations/202610140003_restore_retention_cron_schedules.sql`
9. `supabase/migrations/202610140004_verify_retention_cron_rehearsal.sql`
10. `supabase/migrations/202610140005_persist_preparation_completion.sql`

A new Supabase project must apply the complete chain in timestamp order using either `npx supabase db push` or the Supabase SQL editor, never both. An existing project receives only its unapplied forward migrations; never edit or rerun the initial migration as new history. Verify that `futureslab_submissions.context_snapshot` exists and that the active submission RPC is `submit_futureslab_recommendation(uuid, text, text)` as described in the runbook.

When `package.json` is at the imported repository root, use **Root Directory: leave blank**. Only when this application is the `futureslab` folder inside a larger imported repository, use **Root Directory: `futureslab`**. Vercel receives only the browser-safe `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_FORCE_LOCAL_MODE` values. Supabase service-role credentials and AI-provider keys remain server-side Supabase secrets and must never be placed in `VITE_*` variables or browser code.

Target dates: rehearsal-ready by **October 4, 2026** and live workshop delivery on **October 14, 2026**.

## Verification commands

Run these commands from the application root for each candidate release:

```powershell
npm test
npm run build
```

Pass means the deterministic engine and reference-branding regression tests succeed, and Vite produces a production build without TypeScript errors.
