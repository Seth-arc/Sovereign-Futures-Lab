# Sovereign Futures Lab — Live-Run Completion Promptbook

## Purpose

This promptbook converts the 2026-10-13 live-readiness review into ten bounded closure tasks. The target operating load is **20–50 participants and one facilitator**.

The participant decision engine, frozen submission replay, research boundary, and report generation already exist. This book focuses only on the remaining security, privacy, facilitator-operation, deployment, and cohort-scale gaps.

## Recorded baseline

At repository head `9d0dbe3f79396553607f9114647534501838111e`:

- the working tree was clean;
- `npm test` passed with **117 tests across 8 files** on 2026-10-13;
- a fresh production build, dependency audit, browser matrix, migration rehearsal, and deployed-environment gate were not run as part of that review;
- the committed `dist` directory was generated on 2026-10-01 and is not current-head release evidence;
- all eight tasks in `docs/FACILITATOR_INTERFACE_IMPROVEMENT_PROMPTS.md` remain marked `Not started`.

Do not reuse this baseline as completion evidence. Every prompt below requires fresh verification at the commit being approved for the live workshop.

## Fixed decisions

These constraints apply to every prompt:

- Preserve the React, TypeScript, Vite, Supabase, and vanilla CSS stack.
- Preserve the deterministic decision and consequence boundary. AI may explain; it may not decide or change simulation state.
- Preserve immutable frozen submissions and explicit legacy reconstruction labels.
- Do not add participant scoring, ranking, inferred competence, or a general administration framework.
- Keep local emergency mode browser-local and clearly separate from synchronized facilitation.
- Do not weaken RLS, authentication, retention, audit, or replay rules to make a gate pass.
- Use forward migrations for deployed schema or function changes. Never rewrite an already-applied migration as if it were new history.
- Never put service-role or AI-provider secrets in browser code or `VITE_*` variables.
- Do not record secret values, access tokens, participant exports, or personal data in release evidence.

## Required implementation discipline

For every prompt:

1. Read every file named under **Read first** before editing.
2. Make the smallest change that fully closes the named gap.
3. Update code, the narrowest useful tests, and affected documentation together.
4. Preserve user input and drafts when a recoverable operation fails.
5. Add explicit loading, success, failure, empty, and stale/degraded states where they apply.
6. Do not claim a command, browser gate, migration, or deployed check passed unless it was actually run at the candidate commit.
7. Record blockers honestly. Do not mark a prompt complete on design intent or historical evidence.
8. Keep generated exports and reports out of Git.

## Recommended sequence

Run prompts in this order:

1. Prompt 1 — secure participant rejoin ownership
2. Prompt 2 — correct consent and AI-processing disclosure
3. Prompt 3 — make facilitator refresh and actions reliable
4. Prompt 4 — separate cue browsing, unlocks, and lifecycle controls
5. Prompt 5 — make exports and deletion safe
6. Prompt 6 — reconcile deployment instructions
7. Prompt 8 — persist preparation completion and add preflight
8. Prompt 9 — correct the false connected-participant metric
9. Prompt 10 — close the 50-participant scale gap
10. Prompt 7 — execute the final production go/no-go gate

## Prompt status

The release owner updates this table only after the prompt's full completion gate passes.

| Prompt | Outcome | Status |
|---|---|---|
| 1 | Participant rejoin cannot transfer record ownership | Completed, tested and committed |
| 2 | Consent matches stored data and external AI processing | Not started |
| 3 | Facilitator freshness and action failure are visible | Not started |
| 4 | Cue browsing cannot relock stages; lifecycle states are explicit | Not started |
| 5 | Anonymous/identified exports and destructive actions are safe | Not started |
| 6 | README and deployment instructions describe one valid path | Not started |
| 7 | Current production environment passes the complete go/no-go gate | Not started |
| 8 | Preparation completion is persisted and visible in preflight | Not started |
| 9 | Roster totals are not mislabeled as live presence | Not started |
| 10 | Facilitator path is measured and bounded at 50 participants | Not started |

---

## Prompt 1 — Secure participant rejoin ownership

### Objective

Prevent a second anonymous browser from taking ownership of an existing participant record by presenting the same workshop code and email address.

### Read first

- `supabase/migrations/202609280001_futureslab.sql`
- `supabase/migrations/202610010001_freeze_submission_context.sql`
- `src/data.ts`
- `src/ParticipantApp.tsx`
- `src/types.ts`
- `src/data.test.js`
- `docs/PRODUCT_CONTRACT.md`
- `docs/DEPLOYMENT.md`
- `docs/PRIVACY_NOTICE.md`

### Implementation requirements

1. Add a forward migration that replaces `join_futureslab_session`; do not edit the existing migrations to simulate deployment history.
2. Keep the existing participant row bound to its original `user_id`.
3. Permit an idempotent rejoin only when the authenticated `auth.uid()` already owns that participant row.
4. When the same `(session_id, email)` exists under another user, fail with one bounded error such as `PARTICIPANT_EMAIL_IN_USE`. Do not reveal the participant's name, organization, record ID, decisions, or whether the email belongs to a specific person.
5. Do not create a second participant row for the same session and email.
6. Preserve ordinary same-browser refresh and resume through the existing anonymous Supabase session and stored participant ID.
7. Do not invent unverified cross-device recovery. Document it as unsupported until a separately approved verified recovery flow exists.
8. Give the participant a plain-language recovery message: return to the original browser or contact the facilitator. Do not silently convert the cloud record into a different user's record.
9. Preserve the existing RLS boundary and verify the old owner remains the only participant principal able to read the record.
10. Update product and deployment documentation to match the new rejoin behavior.

### Tests to add

Add the narrowest migration or integration tests that fail if:

- a different `auth.uid()` can replace the participant row's `user_id`;
- the same owner cannot idempotently resume;
- a duplicate email creates a second participant row;
- a failed duplicate join exposes participant data;
- the original owner loses read access after the failed takeover attempt.

If a real disposable Supabase integration test is unavailable, add a migration-contract test and keep the database behavior as a mandatory manual gate. A source-string test alone does not close the security issue.

### Completion criteria

- [ ] A second anonymous browser cannot acquire the first participant's record.
- [ ] The original browser can refresh and resume normally.
- [ ] Duplicate-email handling is deterministic and does not disclose record contents.
- [ ] RLS checks confirm the original owner retains access and the second user has none.
- [ ] Documentation no longer promises unverified cross-device recovery.
- [ ] Fresh tests, production build, and disposable migration gate pass.

### Verification commands

Run from the repository root:

```powershell
git diff --check
npm test
npm run build
```

If a disposable local Supabase project is configured:

```powershell
npx supabase db reset
npx supabase migration list
```

Pass means the full migration chain applies, the new join function is the only current signature, and the automated suite/build succeed.

### Manual two-browser gate

1. Create a disposable rehearsal session.
2. Join in browser A and save a recognizable, non-sensitive test decision.
3. In a clean browser B, use the same join code and email.
4. Confirm browser B receives the bounded duplicate/recovery error and cannot see browser A's data.
5. Refresh browser A and confirm its original record remains available.
6. Confirm no duplicate participant row was created.

---

## Prompt 2 — Correct consent and external-AI processing disclosure

### Objective

Make the participant's sole consent gate accurately describe all retained workshop data and all participant data sent to the configured external AI provider.

### Read first

- `index.html`
- `src/ParticipantApp.tsx`
- `docs/PRIVACY_NOTICE.md`
- `docs/PRODUCT_CONTRACT.md`
- `docs/DEPLOYMENT.md`
- `src/branding.test.js`
- `supabase/functions/advisor-chat/index.ts`
- `supabase/functions/transcribe/index.ts`
- `docs/research/source-ledger.yaml`
- `docs/research/research-cards.yaml`

### Implementation requirements

1. Update the landing consent summary to name, in plain language:
   - name, organization, and email;
   - decisions, rationales, next institutional handoff, and versioned submissions;
   - evidence requests, activity timestamps, facilitator updates, and institutional messages;
   - advisor questions, answers, citations, and transfer reflection;
   - bounded replay metadata used to reconstruct submissions.
2. State that microphone audio is sent to the configured transcription provider only after the participant activates recording and is not stored by this application after transcription.
3. State that advisor questions, participant-visible scenario context, visible facilitator/institutional context, and selected bounded research-card fields may be sent to the configured AI provider.
4. State that source files and full reports are not sent to the provider.
5. State that identified records and exports are available to the facilitator for delivery and debrief.
6. Keep the up-to-30-day application retention statement, while avoiding claims about provider or backup deletion that the provider terms do not guarantee.
7. Update `docs/PRIVACY_NOTICE.md` and the product contract to match the runtime exactly.
8. Mint a new consent version and keep the landing handoff producer and participant handoff consumer in parity.
9. Keep consent affirmative and required. Do not pre-check the box.
10. Record product-owner approval that the selected provider terms and source rights permit the bounded card/excerpt transfer required by `SG-005`. If approval is unavailable, record a live-run blocker rather than weakening the disclosure.

### Tests to add

Add tests that fail if:

- the landing consent omits advisor-context transfer to an external provider;
- stored messages, reflection, next handoff, or replay metadata are omitted;
- the producer and consumer consent versions differ;
- the notice claims full reports are sent or claims unsupported provider deletion guarantees;
- consent becomes optional or preselected.

### Completion criteria

- [ ] The landing checkbox is an accurate concise disclosure of actual processing.
- [ ] The full privacy notice and product contract match the same data inventory.
- [ ] The consent version is updated consistently at both handoff boundaries.
- [ ] External text-advisor and transcription processing are both disclosed.
- [ ] Product-owner/provider-rights approval is recorded without secrets.
- [ ] Fresh tests and production build pass.

### Verification commands

```powershell
git diff --check
npm test
npm run build
rg -n "consentVersion|external AI|advisor questions|microphone audio|30 days" index.html src/ParticipantApp.tsx docs/PRIVACY_NOTICE.md docs/PRODUCT_CONTRACT.md
```

### Manual consent gate

1. Open `/` in a private browser.
2. Confirm consent is unchecked and required.
3. Read only the visible consent summary and verify it describes stored data, facilitator access, transcription, advisor-provider transfer, and retention accurately.
4. Complete entry and confirm the consent handoff contains no personal data in the URL.
5. Inspect one controlled advisor request and one transcription request to confirm the notice matches the actual payload boundary.

---

## Prompt 3 — Make facilitator freshness and action results reliable

### Objective

Ensure the facilitator always knows whether displayed data is current and whether an operational action succeeded, failed, or remains in flight.

### Read first

- `src/FacilitatorApp.tsx`
- `src/data.ts`
- `src/types.ts`
- `src/styles.css`
- `src/branding.test.js`
- `docs/PRODUCT_CONTRACT.md`
- `docs/DEPLOYMENT.md`
- `docs/FACILITATOR_INTERFACE_IMPROVEMENT_PROMPTS.md` Prompt 1

### Implementation requirements

1. Add one explicit synchronization state with at least `INITIAL_LOADING`, `LIVE`, `REFRESHING`, and `STALE`.
2. Keep the last successful session data visible after refresh failure, but label it `Data may be stale` and provide Retry.
3. Record the last successful refresh time for operator context; do not announce every poll through a live region.
4. Prevent an older response from a previously selected session from overwriting the current selection. Use a small request sequence/token rather than a new state library.
5. Refresh immediately when the document becomes visible again.
6. Create one narrow facilitator-action helper or equivalent local pattern that:
   - clears stale errors before an attempt;
   - disables only the matching action;
   - prevents duplicate submission;
   - reports success only after confirmed persistence;
   - reports failure without clearing drafts or changing views;
   - refreshes current data after success.
7. Apply it to session selection, clock changes, stage unlocks, debrief, injects, evidence release, institutional replies, participant removal, close, and delete.
8. Check and propagate required activity-event write failures. Do not silently call a partially logged action audited.
9. Where mutation plus audit event must be atomic, add the smallest scoped database RPC in a forward migration rather than attempting a client-side transaction.
10. Update the product contract and runbook with freshness and failure-recovery behavior.

### Tests to add

Add pure helper/component tests that fail if:

- a failed refresh replaces good data with an empty result;
- stale data remains labeled live;
- an old session request can overwrite a newer selection;
- a matching action can be submitted twice while pending;
- a failed reply clears its draft;
- a mutation reports success before its required audit event succeeds.

### Completion criteria

- [ ] Live, refreshing, and stale data are visibly distinct.
- [ ] Retry preserves the selected session and last successful dataset.
- [ ] Rapid session switching cannot show the wrong session's data.
- [ ] Every operational mutation has bounded loading, success, and failure feedback.
- [ ] Drafts survive failures.
- [ ] Audited operations do not report partial success.
- [ ] Fresh tests and production build pass.

### Verification commands

```powershell
git diff --check
npm test
npm run build
```

If the change adds a migration:

```powershell
npx supabase db reset
```

### Manual failure gate

1. Open session A, then switch quickly to session B while throttling the network. Confirm B remains selected.
2. Take Supabase offline and confirm the last data remains visible but stale.
3. Restore connectivity and use Retry.
4. Force each mutation family to fail once and confirm the draft/current view remains intact.
5. Double-click each mutation and confirm only one request is issued.

---

## Prompt 4 — Separate cue browsing, stage unlocks, and lifecycle controls

### Objective

Prevent facilitator cue-card navigation from changing participant access, and make stage, clock, expiry, and debrief transitions explicit.

### Read first

- `src/FacilitatorApp.tsx`
- `src/ParticipantApp.tsx`
- `src/engine.ts`
- `src/engine.test.ts`
- `src/data.ts`
- `src/scenario.ts`
- `src/types.ts`
- `docs/PRODUCT_CONTRACT.md`
- `docs/DEPLOYMENT.md`
- `docs/FACILITATOR_INTERFACE_IMPROVEMENT_PROMPTS.md` Prompt 2

### Implementation requirements

1. Treat `session.currentStage` only as the highest participant stage unlocked.
2. Remove the control that decrements `session.currentStage`.
3. Add component-local cue-card selection so the facilitator can inspect any guide without mutating participant access.
4. Label `Facilitating now` and `Unlocked through` separately.
5. Permit only a sequential next-stage unlock and name the exact stage in the button.
6. Keep ordinary unlocks monotonic. Do not add relocking.
7. Replace `Start / resume` with `Start casework`, `Pause casework`, or `Resume casework` according to state.
8. At zero, show `Time expired` with an explicit facilitator decision surface. Do not close submissions or start debrief automatically.
9. Before debrief, show participant count, submitted count, current clock, and the exact consequences: submissions close, the clock pauses, and participant debrief opens.
10. Keep unresolved, `NOT_READY`, and unsubmitted participants non-blocking but clearly named in the confirmation.
11. Preserve the existing atomic deterministic debrief state calculation.
12. Update product and operator documentation.

### Tests to add

Add tests that fail if:

- browsing an earlier/future cue changes `session.currentStage`;
- an unlock decreases or skips a stage;
- clock labels do not match lifecycle state;
- time reaching zero automatically closes submissions;
- debrief omits counts or can mutate a frozen submission;
- an unresolved participant is incorrectly blocked from the workshop record.

### Completion criteria

- [ ] Cue-card browsing never changes participant access.
- [ ] Stage access moves forward one stage at a time and never relocks.
- [ ] Clock actions use state-specific language.
- [ ] Time expiry is visible and facilitator-controlled.
- [ ] Debrief confirmation names counts and exact effects.
- [ ] The participant Realtime path receives the intended state change.
- [ ] Fresh tests and production build pass.

### Verification commands

```powershell
git diff --check
npm test
npm run build
```

### Manual two-browser gate

1. Join two participant browsers.
2. Unlock through stage 4 while one participant remains in stage 2.
3. Browse cue cards 1, 3, 5, and 8. Confirm neither participant loses or gains access.
4. Unlock each remaining stage sequentially.
5. Start, pause, resume, and let the clock reach zero.
6. Begin debrief with one participant unsubmitted and confirm the warning is honest but non-blocking.

---

## Prompt 5 — Make exports, closing, and deletion safe

### Objective

Make anonymous and identified exports unmistakably different, and make session closing/deletion explicit, recoverable on failure, and truthful about audit behavior.

### Read first

- `src/FacilitatorApp.tsx`
- `src/report.ts`
- `src/data.ts`
- `src/types.ts`
- `src/styles.css`
- `src/engine.test.ts`
- `src/branding.test.js`
- `supabase/migrations/202609280001_futureslab.sql`
- `docs/PRIVACY_NOTICE.md`
- `docs/PRODUCT_CONTRACT.md`
- `docs/DEPLOYMENT.md`
- `docs/FACILITATOR_INTERFACE_IMPROVEMENT_PROMPTS.md` Prompt 7

### Implementation requirements

1. Split workshop exports into:
   - anonymous group-comparison formats; and
   - identified facilitator-only formats.
2. Make the anonymity control state exactly which formats it affects. It must not visually govern roster CSV or identified JSON when it does not alter them.
3. Before every identified export, show a concise confirmation naming included personal data and facilitator-only handling.
4. Preserve selected submission version and replay provenance in every applicable format.
5. Surface popup, Blob, PDF-generation, and download failures.
6. Replace immediate close with an accessible confirmation stating that submissions close, the clock stops, participants become read-only, and records remain until expiry/deletion.
7. Require the exact join code as typed confirmation before deletion.
8. Preserve the selected session until deletion is confirmed by the server; show deletion failures visibly.
9. Do not require export before privacy deletion.
10. Determine and document deletion audit truth. Because deleting a session cascades its application records, do not claim the deleted session retains an in-database audit entry unless a separate approved durable audit surface actually exists.
11. Make any action described as audited atomic with its required event, using a narrow RPC where necessary.
12. Do not add external report storage.

### Tests to add

Add tests that fail if:

- an identified CSV/JSON appears governed by an anonymity switch it ignores;
- anonymous HTML/PDF includes participant name, organization, email, or participant ID;
- an identified download starts before disclosure confirmation;
- wrong typed confirmation deletes a session;
- a failed deletion removes the selected session from the UI;
- docs claim an audit record survives when the cascade deletes it.

### Completion criteria

- [ ] Anonymous and identified exports are visibly separate.
- [ ] Each identified export requires informed confirmation.
- [ ] Anonymous formats contain no participant identity.
- [ ] Close and delete confirmations state exact consequences.
- [ ] Deletion requires the exact join code and remains failure-visible.
- [ ] Audit and retention statements match actual persistence.
- [ ] Fresh tests, migration checks where applicable, and production build pass.

### Verification commands

```powershell
git diff --check
npm test
npm run build
```

If mutation RPCs are added:

```powershell
npx supabase db reset
```

### Manual export/lifecycle gate

1. Generate anonymous HTML and PDF and search them for every test participant identifier.
2. Start each identified export and confirm disclosure precedes download.
3. Cancel session closing once, then close deliberately.
4. Enter an incorrect deletion code and confirm nothing changes.
5. Force deletion failure and confirm the session remains selected.
6. Delete a disposable rehearsal with the exact code and confirm the documented cascade behavior.

---

## Prompt 6 — Reconcile deployment instructions

### Objective

Make README, post-copy setup, and the deployment runbook describe one valid repository layout, migration chain, and release workflow.

### Read first

- `README.md`
- `docs/POST_COPY_SETUP.md`
- `docs/DEPLOYMENT.md`
- `package.json`
- `vite.config.ts`
- `vercel.json`
- `supabase/config.toml`
- every committed file under `supabase/migrations/`

### Implementation requirements

1. State that both committed migrations must be applied in timestamp order.
2. Explain that existing projects receive forward migrations; operators must not rerun or edit the initial migration.
3. State that a new project may apply the complete chain with `db push` or the SQL editor, but not both.
4. Use conditional Vercel root guidance:
   - repository root when `package.json` is at the imported repository root;
   - `futureslab` only when this folder is nested inside a larger repository.
5. Remove unconditional `cd futureslab` examples where they do not match this repository layout, or clearly label them as nested-folder examples.
6. Keep Vercel variables browser-safe and Supabase/AI secrets server-side.
7. Add a migration verification step that checks the `context_snapshot` column and the three-argument submission RPC.
8. Keep the full runbook canonical and make README link to it rather than maintaining a contradictory abbreviated process.
9. Update any tests that pin old instructions.

### Tests to add

Add a small documentation contract test only if the repository already uses such tests for deployment text. It should fail if:

- README omits the forward migration;
- README and the runbook prescribe contradictory Vercel roots;
- any doc recommends placing service-role or AI keys in `VITE_*` variables;
- the documented RPC signature is stale.

### Completion criteria

- [ ] All setup documents name the full migration chain.
- [ ] Root-directory guidance matches both standalone and nested layouts.
- [ ] Secret placement is consistent and safe.
- [ ] Snapshot/RPC verification is explicit.
- [ ] No stale setup command can produce the known broken deployment.
- [ ] Fresh tests and production build pass.

### Verification commands

```powershell
git diff --check
npm test
npm run build
rg -n "202609280001|202610010001|Root Directory|VITE_|submit_futureslab_recommendation" README.md docs/POST_COPY_SETUP.md docs/DEPLOYMENT.md
```

### Manual documentation gate

Have an operator unfamiliar with the repository follow the setup documents against a disposable project. Pass means they choose the correct Vercel root, apply both migrations once, deploy both JWT-protected functions, and never place a reusable secret in Vercel browser variables.

---

## Prompt 7 — Execute and record the final production go/no-go gate

### Objective

Produce current, reproducible evidence that the exact candidate commit and production environment can run the live workshop. This prompt is last even though it retains issue number 7.

### Read first

- `docs/DEPLOYMENT.md`
- `docs/PRODUCT_CONTRACT.md`
- `docs/PRIVACY_NOTICE.md`
- `.env.example`
- `package.json`
- `vercel.json`
- `supabase/config.toml`
- every committed migration and Edge Function
- the completed evidence from Prompts 1–6 and 8–10

### Implementation requirements

1. Create a dated release-evidence document under `docs/release-evidence/` for the exact candidate commit. Do not overwrite prior evidence.
2. Record:
   - full Git SHA and clean/dirty status;
   - production URL and confirmed Vercel deployment SHA;
   - Node/npm versions;
   - test, build, and production dependency-audit results;
   - migration list and verification queries;
   - deployed Edge Functions with JWT verification enabled;
   - RLS and unauthorized-access outcomes;
   - facilitator email/SMTP result;
   - anonymous-auth shared-IP capacity result;
   - AI text/transcription model, quota, and failure-fallback result without secret values;
   - retention-job execution results;
   - production smoke, functional, capacity, fallback, accessibility, export, monitoring, and rollback outcomes.
3. Link logs or screenshots only when their storage location is approved and contains no participant personal data or secrets.
4. Use a distinct rehearsal session. Never convert rehearsal data into the live session.
5. Record every failed or unrun gate as `BLOCKED`, with owner and next action. Do not use `PASS` for historical results.
6. Require facilitator approval of the exact production URL, commit, join plan, fallback plan, and monitoring setup.
7. Create the new `LIVE` session only after the release gate passes; keep its join code out of Git and release evidence.

### Completion criteria

- [ ] Clean candidate commit is identified exactly.
- [ ] Tests, build, and dependency audit pass at that commit.
- [ ] Full migration chain and both JWT-protected functions are deployed.
- [ ] RLS and unauthorized-access checks pass.
- [ ] Facilitator magic-link delivery works on the workshop device.
- [ ] Venue/shared-IP anonymous sign-in capacity is proven.
- [ ] AI text, transcription, quota, and fallback fit the facilitation plan.
- [ ] Both 30-day retention jobs completed successfully at least once.
- [ ] Privacy/provider approval from Prompt 2 is recorded.
- [ ] Production smoke, full functional, 50-participant capacity, and failure rehearsal pass.
- [ ] Every export opens and contains the intended identity boundary.
- [ ] Monitoring and rollback have been exercised.
- [ ] The facilitator signs off on the exact deployment.

### Local verification commands

```powershell
git status --short
git rev-parse HEAD
node --version
npm --version
npm ci
npm test
npm run build
npm audit --omit=dev
```

### Supabase verification commands

Run only against the intended linked project after confirming the project reference:

```powershell
npx supabase projects list
npx supabase migration list
npx supabase db push --dry-run
npx supabase functions list
npx supabase secrets list
```

Do not print secret values. Use the SQL verification queries already maintained in `docs/DEPLOYMENT.md` to confirm the snapshot column, current submission RPC signature, RLS, and frozen rehearsal row.

### Production manual gate

Execute sections 10–16 of `docs/DEPLOYMENT.md` at the candidate commit. Pass means every required item has current evidence and no blocker remains. A missing result is a blocker, not an implicit pass.

---

## Prompt 8 — Persist preparation completion and add facilitator preflight

### Objective

Replace browser-only preparation completion with one explicit, idempotent, session-scoped cloud fact while preserving local emergency behavior.

### Read first

- `src/ParticipantApp.tsx`
- `src/FacilitatorApp.tsx`
- `src/data.ts`
- `src/types.ts`
- `src/ReferenceExperience.tsx`
- `src/styles.css`
- `src/branding.test.js`
- `supabase/migrations/202609280001_futureslab.sql`
- `docs/PRIVACY_NOTICE.md`
- `docs/PRODUCT_CONTRACT.md`
- `docs/DEPLOYMENT.md`
- `docs/FACILITATOR_INTERFACE_IMPROVEMENT_PROMPTS.md` Prompt 3

### Implementation requirements

1. Add a nullable `preparation_completed_at timestamptz` in a forward migration.
2. Add the smallest authenticated participant RPC needed to set it only when null. Validate participant ownership through `auth.uid()`.
3. Write the timestamp only after the Learning Bridge completion handoff succeeds.
4. Keep the first completion time unchanged when Orientation or the bridge is replayed.
5. Map the field through shared types and participant/facilitator data loading.
6. Use the cloud timestamp as the source of truth in cloud mode. Keep local storage only for local emergency mode.
7. Label legacy null values `Not reported`; never infer incomplete preparation from stage, decisions, time, or advisor use.
8. Add facilitator preflight counts for registered, preparation complete, not reported, and current submissions.
9. Allow starting casework with incomplete/not-reported preparation only after explicit acknowledgement; do not strand the workshop behind a hard gate.
10. Update the privacy notice, product contract, and retention documentation for the timestamp.

### Tests to add

Add tests that fail if:

- completion is written after Orientation alone;
- replaying preparation changes the original timestamp;
- one participant can write another participant's timestamp;
- cloud completion still depends only on local storage;
- legacy null is labeled skipped or failed;
- preflight blocks the facilitator absolutely rather than allowing acknowledged continuation.

### Completion criteria

- [ ] Preparation completion is explicit, idempotent, and participant/session scoped.
- [ ] Cloud refresh/rejoin under the same authenticated owner sees the persisted completion state without depending on local storage.
- [ ] Legacy records remain honest and usable.
- [ ] Facilitator preflight shows concise counts.
- [ ] Starting with incomplete preparation requires acknowledgement but remains possible.
- [ ] Privacy, retention, migration, tests, and runtime behavior align.
- [ ] Fresh tests, migration gate, and production build pass.

### Verification commands

```powershell
git diff --check
npm test
npm run build
npx supabase db reset
```

Run `supabase db reset` only against a disposable local project, never a linked production project.

### Manual preflight gate

1. Join one new participant and load one legacy/null fixture.
2. Complete Orientation only; confirm preparation is not complete.
3. Complete the bridge; confirm the timestamp and preflight count update once.
4. Replay both surfaces; confirm the original timestamp is unchanged.
5. Refresh and resume; confirm preparation remains complete.
6. Start a rehearsal with one not-reported participant and confirm acknowledgement is required but continuation is allowed.

---

## Prompt 9 — Correct the false connected-participant metric

### Objective

Stop presenting registered database rows as proof of a live browser connection.

### Read first

- `src/FacilitatorApp.tsx`
- `src/data.ts`
- `src/types.ts`
- `src/branding.test.js`
- `docs/PRODUCT_CONTRACT.md`
- `docs/FACILITATOR_INTERFACE_IMPROVEMENT_PROMPTS.md` Prompt 4

### Implementation requirements

1. Rename the roster total to `Registered participants` or another exact database-backed label.
2. Keep `Active in last 2 min` only if it remains clearly described as recent recorded activity, not presence or connection.
3. Do not add a presence system solely to preserve the word `Connected`.
4. Search participant, facilitator, report, and documentation copy for other connection/presence claims not backed by an actual presence channel.
5. If true presence is later required, treat it as a separate scoped change with disconnect, sleeping-tab, and timeout semantics.

### Tests to add

Add or update the narrow source/UI contract test that fails if the roster count is labeled connected, online, or present without a real presence implementation.

### Completion criteria

- [ ] The roster total uses an exact data-backed label.
- [ ] Recent activity is not described as a live connection.
- [ ] No new presence infrastructure was added.
- [ ] Product documentation matches the metric.
- [ ] Fresh tests and production build pass.

### Verification commands

```powershell
git diff --check
npm test
npm run build
rg -n -i "connected participants|online participants|participants present|registered participants|active in last" src docs
```

### Manual metric gate

Join two participants, close one browser, and leave its database row intact. Pass means the total still says registered—not connected—and the recent-activity label does not imply a live socket.

---

## Prompt 10 — Bound and measure the 50-participant facilitator path

### Objective

Keep the facilitator console responsive at the committed 50-participant load without repeatedly downloading unbounded session history or rebuilding every report on each refresh.

### Read first

- `src/FacilitatorApp.tsx`
- `src/data.ts`
- `src/report.ts`
- `src/engine.ts`
- `src/App.tsx`
- `src/main.tsx`
- `src/types.ts`
- `package.json`
- `vite.config.ts`
- `docs/PRODUCT_CONTRACT.md`
- `docs/DEPLOYMENT.md`
- `docs/FACILITATOR_INTERFACE_IMPROVEMENT_PROMPTS.md` Prompts 6 and 8

### Measure before editing

Using a disposable 50-participant rehearsal fixture, record:

- queries per initial load and per refresh interval;
- rows/bytes transferred per operational table;
- refresh duration at p50 and worst observed value during the rehearsal;
- time spent building all AARs;
- initial JavaScript chunk sizes;
- interaction responsiveness while polling, switching views, opening replay, and exporting.

Do not invent measurements or use the existing approximately 657 KB bundle as proof of runtime failure.

### Implementation requirements

1. Stop reloading complete unbounded evidence, submissions, messages, advisor turns, and activity-event history every three seconds.
2. Prefer selected-session Realtime changes for operational state, with a slower bounded reconciliation refresh so dropped messages cannot create permanent drift.
3. Scope and clean up every subscription/request when the selected session changes or the console unmounts.
4. Fetch detailed transcript, timeline, and replay history only when the facilitator opens the relevant participant/replay/export action.
5. Build only the selected AAR on demand. Do not map the whole roster through `buildAfterActionReport` on each render.
6. Keep roster/overview queries bounded to the fields and time window they actually need.
7. Add pagination or progressive rendering only if the 50-participant measurement shows it is necessary.
8. Preserve a visible reconciliation/stale state from Prompt 3.
9. Use route/component dynamic imports where they materially reduce the initial bundle; do not suppress Vite's warning or raise the warning limit as the fix.
10. Keep export dependencies loaded only when an export is requested.
11. Re-measure with the same fixture and record before/after evidence in the deployment documentation.
12. Do not relax the 50-participant target.

### Tests to add

Add tests that fail if:

- operational refresh returns unbounded full history;
- a prior session subscription survives selection change;
- all participant AARs are built during an ordinary overview render;
- a selected replay loads another session's records;
- reconciliation failure is hidden;
- code splitting is replaced by warning suppression.

### Completion criteria

- [ ] The 50-participant measurement is recorded before and after.
- [ ] Refresh/query traffic is bounded and selected-session scoped.
- [ ] Realtime has a slower reconciliation path.
- [ ] Detailed histories and AARs are lazy.
- [ ] Console controls remain responsive throughout the rehearsal.
- [ ] Initial production chunk sizes are recorded and any remaining advisory has an honest owner/blocker.
- [ ] No participant/session boundary regresses.
- [ ] Fresh tests and production build pass.

### Verification commands

```powershell
git diff --check
npm test
npm run build
Get-ChildItem dist\assets -File | Sort-Object Length -Descending | Select-Object Name,Length
```

### Manual 50-participant gate

1. Load a disposable rehearsal with 50 participant records and representative submissions, requests, messages, advisor turns, and events.
2. Open overview, participants, communications, injects, replay, and exports.
3. Switch sessions during an active refresh.
4. Force one Realtime disconnect and confirm reconciliation restores correct state.
5. Open one detailed AAR and switch among versions.
6. Generate each export.
7. Record actual query, transfer, timing, and bundle results.

Pass means the console remains operationally responsive, session boundaries remain correct, and no gate relies on an invented or historical measurement.

---

## Final integrated live-run completion gate

Do not approve the workshop until all ten prompts pass at one candidate commit.

### Security and privacy

1. Attempt the duplicate-email takeover from a second anonymous browser.
2. Verify RLS blocks cross-participant and unauthorized facilitator access.
3. Confirm the live consent text matches advisor and transcription payloads.
4. Confirm identified exports require disclosure and anonymous exports contain no identity.

### Facilitator operations

1. Switch sessions during refresh and recover from a forced stale state.
2. Force clock, unlock, inject, evidence, reply, close, and delete failures.
3. Browse cue cards without changing participant access.
4. Let time expire, then deliberately choose the next lifecycle action.
5. Confirm preflight and roster labels report only observable facts.

### Replay and lifecycle

1. Create two submissions with evidence changing between versions.
2. Begin debrief with another participant unresolved or unsubmitted.
3. Confirm both versions retain their own decisions, evidence, consequences, and provenance.
4. Close and delete only through the new confirmation boundaries.

### Scale and recovery

1. Complete the 50-participant venue/shared-IP rehearsal.
2. Interrupt Supabase, AI text, transcription, Realtime, and the venue network separately.
3. Confirm stale/degraded states and local emergency handoff behavior are honest.
4. Exercise monitoring and rollback against the exact candidate deployment.

### Final commands

```powershell
git status --short
git diff --check
git rev-parse HEAD
npm ci
npm test
npm run build
npm audit --omit=dev
```

Pass means the working tree is clean, the exact candidate commit is deployed, every automated and manual gate has current evidence, and the facilitator has approved the production URL and fallback plan.

