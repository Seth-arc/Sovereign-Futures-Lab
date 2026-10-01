# Sovereign Futures Lab - Facilitator Interface Improvement Prompts

## Purpose

This handbook converts the facilitator-interface review into a sequenced implementation queue. Each prompt is intended to be handed to a coding agent as a self-contained task.

The goal is to turn the existing facilitator console into a reliable live workshop control room without adding participant scoring, weakening deterministic replay, or building a general administration framework.

The desired operating model is:

> prepare -> facilitate -> observe -> intervene -> reconstruct -> transfer

## Starting baseline

The human-run baseline recorded on 2026-10-01 is:

- targeted branding, advisor-research, and engine tests passed;
- the full suite passed with 112 tests across 8 files;
- the production build passed;
- Vite reported an advisory warning because the main JavaScript chunk was approximately 655 kB after minification;
- the six-step manual browser gate for the scenario-consolidation work remained a separate human verification item.

Do not reuse these historical results as evidence for any prompt below. Every prompt requires fresh verification at the current head.

## Fixed product decisions

These decisions apply to every prompt in this handbook:

- The participant role remains the Debt Management Office. Do not add participant roles, multiplayer bargaining, or geography expansion.
- The facilitator guides the exercise but does not decide for participants, edit submitted decisions, or replace deterministic outcomes.
- Stage progress is descriptive navigation state, not evidence of completion, competence, or performance.
- No participant scoring, ranking, confidence score, inferred competence, or behavioral prediction.
- Honest `NOT_READY`, unresolved, and conditional positions remain valid.
- The eight-stage process, facilitator guides, evidence catalog, and scenario facts remain canonical in `src/scenario.ts`.
- A stage unlock is a monotonic grant of access. Browsing a cue card must never relock a participant or mutate participant state.
- New facilitator signals must be explicit facts or deterministic derivations. Do not infer preparation, attention, or readiness from weak proxies.
- Frozen submissions and their evidence-time context are immutable. Facilitator improvements may select and explain a version but may not reinterpret it with current working state.
- Routine evidence remains authored and delayed. Early release must remain explicit, participant-scoped, timestamped, and auditable.
- Exceptional institutional replies remain bounded role-play. Do not turn the request desk into a general chat system or let AI manufacture an institutional answer.
- Identified exports remain facilitator-only. Anonymized and identified exports must never be presented as equivalent.
- Preserve the existing React, TypeScript, Vite, Supabase, and vanilla CSS stack. Do not add a state-management framework, component framework, or CSS preprocessor.
- Preserve the current one-facilitator access boundary unless a separate explicit prompt authorizes an authentication redesign.

## Required implementation discipline

For every prompt:

1. Read every named file before editing.
2. Work only in the named files first. If a dependency forces a wider change, explain it in the handoff.
3. Deliver code, the narrowest useful tests, and documentation together.
4. Keep deterministic decisions in `src/engine.ts`; the facilitator UI may display or invoke them but may not duplicate or weaken them.
5. Preserve participant information boundaries and do not expose canonical answers before evidence becomes available.
6. Give every operation an explicit loading, success, failure, empty, and stale-data state where applicable.
7. Do not silently relax a gate, timer rule, replay rule, or deletion warning to make a test pass.
8. Do not claim that tests, builds, migrations, or browser gates passed unless the human ran them and supplied the output.
9. Do not edit `docs/LEARNING_EXPERIENCE_COMPLETION_PROMPTS.md` as part of these prompts. It remains the learning-experience specification.
10. Do not mark a prompt complete. The human operator updates the status table after running its full gate.

The coding agent creates and edits files. The human operator runs verification, migrations, browser gates, and commit commands.

## Prompt status

| Prompt | Outcome | Status |
|---|---|---|
| 1 | Reliable refresh and facilitator action feedback | Not started |
| 2 | Separate cue browsing, stage unlocking, and lifecycle controls | Not started |
| 3 | Persist preparation completion and add session preflight | Not started |
| 4 | Build a descriptive live overview and needs-attention queue | Not started |
| 5 | Make communications, evidence release, and injects operationally safe | Not started |
| 6 | Turn Replay & Debrief into a version-aware facilitation workspace | Not started |
| 7 | Clarify exports, privacy, closing, deletion, and audit truth | Not started |
| 8 | Meet cohort-scale, accessibility, mobile, and bundle-performance gates | Not started |

---

## Prompt 1 - Make refresh and facilitator actions reliable

### Objective

Ensure the facilitator always knows whether the console is current and whether an action succeeded. Remove silent refresh failures and unhandled command failures before adding new dashboard features.

### Read first

- `src/FacilitatorApp.tsx`
- `src/data.ts`
- `src/types.ts`
- `src/styles.css`
- `src/branding.test.js`
- `docs/PRODUCT_CONTRACT.md`

### Implementation requirements

1. Replace the polling path that discards refresh failures with an explicit synchronization state containing at least:
   - `refreshing`;
   - `lastSuccessfulRefreshAt`;
   - `stale`;
   - the latest safe error message.
2. Show a compact status in the facilitator shell:
   - `Live` after a recent successful refresh;
   - `Refreshing` while a refresh is active;
   - `Data may be stale` after a failed refresh;
   - a manual `Retry` action.
3. Keep the last successful dataset visible during a transient refresh failure. Do not replace it with an empty state and do not imply it is current.
4. Prevent an older request for a previously selected session from overwriting a newer selected session.
5. Refresh immediately when the facilitator returns to a visible browser tab, while retaining the bounded background cadence.
6. Add one narrow action wrapper or equivalent pattern for facilitator mutations. It must:
   - prevent duplicate submission of the same action;
   - clear stale errors before the attempt;
   - surface a success message only after confirmed persistence;
   - surface a failure message without clearing the facilitator's draft or current view;
   - trigger a fresh read after success.
7. Apply the pattern to clock controls, stage changes, debrief transition, inject send, evidence release, institutional reply, participant removal, session close, and session deletion.
8. Use action-specific busy state rather than freezing unrelated controls across the console.
9. Do not add optimistic state for destructive or lifecycle-changing operations unless the server result has been confirmed.
10. If an activity-event write is part of an action's success contract, propagate its failure instead of silently reporting full success. Do not call an action audited if its event write failed.
11. Update `docs/PRODUCT_CONTRACT.md` with the freshness and failure-visibility contract.

### Test requirements

Add or update tests that fail if:

- a refresh rejection is swallowed;
- stale data is presented as live;
- an old session response can overwrite a newly selected session;
- a failed inject, release, reply, remove, close, or delete operation produces no visible error;
- the same action can be submitted twice while in flight;
- a successful action fails to refresh the selected session;
- a failed mutation clears an unsent reply or inject draft.

Extract only the smallest pure synchronization/action-state helpers needed for direct unit tests, and create `src/facilitatorOperations.test.ts` for those contracts. Do not introduce a general client state framework.

### Completion criteria

- [ ] The facilitator can distinguish live, refreshing, and stale data.
- [ ] A refresh failure leaves the last successful data visible with a retry path.
- [ ] Every facilitator mutation has loading, success, and failure feedback.
- [ ] Duplicate actions are blocked while the matching action is in flight.
- [ ] Session switching cannot display data from the wrong session.
- [ ] Product documentation describes the operational truth.
- [ ] Fresh targeted tests, the full suite, and production build pass when run by the human.

### Human-run verification commands

```powershell
npm test -- src/facilitatorOperations.test.ts
npm test -- src/branding.test.js
npm test
npm run build
```

Manual browser gate:

1. Open one session, switch rapidly to another, and confirm the second session remains selected.
2. Simulate an offline or failed refresh and confirm the existing data remains visible but is labeled stale.
3. Restore connectivity and use Retry.
4. Force one facilitator action to fail and confirm its draft or context remains intact.
5. Double-click an action and confirm only one mutation is issued.

### Human-run commit commands

Review the actual changed-file list before staging.

```powershell
git status --short
git diff --check
git diff -- src/FacilitatorApp.tsx src/data.ts src/types.ts src/styles.css src/facilitatorOperations.test.ts src/branding.test.js docs/PRODUCT_CONTRACT.md
git add -- src/FacilitatorApp.tsx src/data.ts src/types.ts src/styles.css src/facilitatorOperations.test.ts src/branding.test.js docs/PRODUCT_CONTRACT.md
git commit -m "Harden facilitator refresh and action feedback"
```

---

## Prompt 2 - Separate cue browsing, stage unlocking, and lifecycle controls

### Objective

Make the facilitator's instructional navigation independent from the participant access ceiling, and present session lifecycle actions with precise effects.

### Read first

- `src/FacilitatorApp.tsx`
- `src/ParticipantApp.tsx`
- `src/engine.ts`
- `src/scenario.ts`
- `src/data.ts`
- `src/types.ts`
- `src/engine.test.ts`
- `src/branding.test.js`
- `docs/PRODUCT_CONTRACT.md`
- `README.md`

### Implementation requirements

1. Treat `session.currentStage` as the highest participant stage unlocked by the facilitator.
2. Remove any facilitator control that decrements `session.currentStage` for the purpose of reviewing a previous cue card.
3. Add local cue-card browsing state that lets the facilitator inspect any stage guide without changing participant access.
4. Visually distinguish:
   - `Facilitating now` - the cue card currently being used;
   - `Unlocked through` - the highest participant stage available;
   - future locked stages.
5. Keep participant unlocks sequential. A facilitator may unlock only the next stage, not jump from stage 2 to stage 7.
6. State the next unlock effect in the button label, for example `Unlock Stage 4 - Record`.
7. Keep unlocks monotonic during ordinary facilitation. Do not add a relock operation.
8. Preserve the deterministic debrief transition to the final stage. It remains distinct from an ordinary stage unlock.
9. Replace the ambiguous `Start / resume` label with state-specific controls:
   - `Start casework` from the ready/lobby state;
   - `Pause casework` while running;
   - `Resume casework` while paused;
   - disabled status text during debrief or after closure.
10. When the clock reaches zero, show an explicit time-expired state and a facilitator decision surface. Do not silently close submissions or invent an automatic debrief transition.
11. Before debrief, show a confirmation summary containing participant count, submitted count, current clock, and the exact effects: close submissions, pause the clock, and open participant debrief.
12. Do not block debrief merely because some participants are unresolved, `NOT_READY`, or unsubmitted. Warn clearly and preserve the facilitator's deliberate choice.
13. Update product and delivery documentation.

### Test requirements

Add or update tests that fail if:

- browsing a previous cue card decreases the session's unlocked stage;
- an ordinary stage action skips more than one stage;
- a participant loses access to a previously unlocked stage;
- the cue-card index and unlocked-stage ceiling are presented as the same concept;
- Start, Pause, and Resume produce invalid session/clock combinations;
- reaching `00:00` silently begins debrief or closes submissions;
- Begin debrief fails to state its effects;
- debrief is blocked solely because a participant submitted `NOT_READY` or retained unresolved evidence.

Keep lifecycle derivation in pure functions where practical and pin it in `src/engine.test.ts` or `src/facilitatorOperations.test.ts`.

### Completion criteria

- [ ] Cue cards can be reviewed without mutating participant access.
- [ ] Stage access moves forward sequentially and never relocks during ordinary facilitation.
- [ ] Clock controls use state-specific language and valid transitions.
- [ ] Time expiry is visible and facilitator-controlled.
- [ ] Debrief confirmation shows current counts and exact consequences.
- [ ] Non-ready and unresolved submissions remain valid records.
- [ ] Documentation matches the implemented lifecycle.
- [ ] Fresh tests and build pass when run by the human.

### Human-run verification commands

```powershell
npm test -- src/engine.test.ts
npm test -- src/facilitatorOperations.test.ts
npm test -- src/branding.test.js
npm test
npm run build
```

Manual browser gate:

1. Join with two participant browsers.
2. Browse future and previous cue cards and confirm neither participant's access changes.
3. Unlock stages sequentially and confirm both participants receive access without refresh.
4. Start, pause, and resume casework.
5. Let a rehearsal clock reach zero and confirm submissions remain open until the facilitator acts.
6. Begin debrief with one participant unsubmitted and confirm the warning is honest but non-blocking.

### Human-run commit commands

```powershell
git status --short
git diff --check
git diff -- src/FacilitatorApp.tsx src/ParticipantApp.tsx src/engine.ts src/scenario.ts src/data.ts src/types.ts src/engine.test.ts src/facilitatorOperations.test.ts src/branding.test.js docs/PRODUCT_CONTRACT.md README.md
git add -- src/FacilitatorApp.tsx src/ParticipantApp.tsx src/engine.ts src/scenario.ts src/data.ts src/types.ts src/engine.test.ts src/facilitatorOperations.test.ts src/branding.test.js docs/PRODUCT_CONTRACT.md README.md
git commit -m "Separate facilitation cues from stage unlocks"
```

---

## Prompt 3 - Persist preparation completion and add session preflight

### Objective

Give the facilitator an explicit, privacy-bounded view of who has completed preparation and whether the room is ready to start casework.

### Read first

- `src/ParticipantApp.tsx`
- `src/FacilitatorApp.tsx`
- `src/data.ts`
- `src/types.ts`
- `src/scenario.ts`
- `supabase/migrations/202609280001_futureslab.sql`
- every later migration affecting `futureslab_participants`
- `src/data.test.js`
- `src/branding.test.js`
- `docs/PRODUCT_CONTRACT.md`
- `docs/PRIVACY_NOTICE.md`

### Implementation requirements

1. Add the smallest explicit preparation-completion field required for cloud monitoring, preferably a nullable `preparation_completed_at` timestamp on the participant record.
2. Write the timestamp only after the Learning Bridge completion handoff succeeds.
3. Make the write idempotent. Replaying Orientation or the Learning Bridge must not change the original completion time or reset participant work.
4. Keep local emergency mode browser-local. Do not imply that a facilitator can monitor a participant who is not synchronized to the cloud session.
5. Treat legacy `null` values as `Not reported`, not as proof that preparation was skipped or failed.
6. Do not infer preparation completion from current stage, decisions, elapsed time, or advisor use.
7. Add a preflight panel before casework begins containing:
   - join code with an accessible Copy action;
   - total joined;
   - active in the last two minutes;
   - preparation complete;
   - preparation not yet reported;
   - current synchronization freshness;
   - the casework duration and start effect.
8. Let the facilitator start with incomplete preparation after an explicit warning. Do not create a hard gate that strands a legitimate workshop.
9. Announce preparation-count changes politely without repeatedly interrupting assistive technology on every poll.
10. Update the privacy notice and product contract to name the timestamp, purpose, visibility, and retention behavior.
11. Add a forward migration. Do not edit an already-applied migration to simulate deployment history.

### Test requirements

Add or update tests that fail if:

- preparation is inferred from stage or decision data;
- first completion is not persisted for a cloud participant;
- replay changes the completion timestamp;
- a legacy null is labeled incomplete or failed;
- starting with incomplete preparation is silently blocked;
- the preflight count includes local-only or wrong-session participants;
- copying the join code lacks an accessible success/failure state;
- privacy and product documentation omit the new field.

Add a narrow migration-contract test if the repository does not already have one suitable for this field.

### Completion criteria

- [ ] Preparation completion is explicit, idempotent, and session-scoped.
- [ ] Legacy rows remain honest and usable.
- [ ] The facilitator has a concise preflight operating picture.
- [ ] Starting with incomplete preparation requires acknowledgement but remains possible.
- [ ] No additional participant profile data is collected.
- [ ] Privacy, retention, tests, and migration history align.
- [ ] Fresh tests, migration verification, and build pass when run by the human.

### Human-run verification commands

```powershell
npm test -- src/data.test.js
npm test -- src/branding.test.js
npm test -- src/facilitatorOperations.test.ts
npm test
npm run build
```

If a disposable local Supabase environment is configured:

```powershell
supabase db reset
```

Manual browser gate:

1. Join with one new participant and one legacy/null fixture.
2. Complete Orientation only and confirm preparation is not reported complete.
3. Complete the Learning Bridge and confirm the preflight count changes once.
4. Replay both surfaces and confirm the completion time remains unchanged.
5. Start a rehearsal with one participant not yet reported and confirm the warning is non-blocking.

### Human-run commit commands

Replace the migration placeholder with the actual new migration filename.

```powershell
git status --short
git diff --check
git diff -- src/ParticipantApp.tsx src/FacilitatorApp.tsx src/data.ts src/types.ts src/scenario.ts supabase/migrations src/data.test.js src/branding.test.js src/facilitatorOperations.test.ts docs/PRODUCT_CONTRACT.md docs/PRIVACY_NOTICE.md
git add -- src/ParticipantApp.tsx src/FacilitatorApp.tsx src/data.ts src/types.ts src/scenario.ts supabase/migrations src/data.test.js src/branding.test.js src/facilitatorOperations.test.ts docs/PRODUCT_CONTRACT.md docs/PRIVACY_NOTICE.md
git commit -m "Add facilitator preparation preflight"
```

---

## Prompt 4 - Build a descriptive live overview and needs-attention queue

### Objective

Let one facilitator understand a 20-50 participant room at a glance without converting activity into scores, rankings, or inferred competence.

### Read first

- `src/FacilitatorApp.tsx`
- `src/engine.ts`
- `src/scenario.ts`
- `src/types.ts`
- `src/styles.css`
- `src/engine.test.ts`
- `src/branding.test.js`
- `docs/PRODUCT_CONTRACT.md`

### Implementation requirements

1. Correct misleading metrics. The existing total roster count must not be labeled `Connected participants` unless genuine presence is measured.
2. Present a compact live overview containing:
   - joined participants;
   - active in the last two minutes;
   - preparation complete/not reported;
   - participants by current saved stage;
   - submitted participants and latest submission version;
   - pending exceptional requests;
   - evidence responses still within their authored delay;
   - current sync freshness.
3. Label stage distribution as navigation or working position, never completion.
4. Add a deterministic `Needs attention` queue. Eligible reasons are limited to observable facts such as:
   - participant inactive beyond a documented threshold;
   - exceptional request awaiting a reply;
   - evidence response due soon or still pending;
   - no submitted version when debrief is about to begin;
   - a deterministic recommendation review mismatch already produced by the engine;
   - a save/synchronization error explicitly reported by the client, if such a signal exists.
5. Do not use advisor transcript sentiment, writing style, elapsed time alone, number of clicks, organization, or identity to infer attention.
6. Do not rank participants or collapse multiple signals into a score.
7. Each attention item must state:
   - the observable condition;
   - when it was observed;
   - the relevant participant or session;
   - a direct navigation action to the existing operational surface.
8. Provide filters for stage and attention reason while keeping the default view concise.
9. Use human-readable decision labels from the canonical scenario/recommendation definitions instead of raw enum strings.
10. Keep identity visible only in facilitator-only views. Workshop comparison remains anonymized by default.
11. Extract pure overview/attention derivation functions for direct tests rather than testing only source strings.
12. Document every attention rule and its non-scoring boundary.

### Test requirements

Add or update tests that fail if:

- roster count is mislabeled as live presence;
- a visited stage is called complete;
- an attention item is based on identity, organization, prose quality, advisor sentiment, or a probabilistic score;
- the same observable dataset produces nondeterministic attention results;
- recommendation mismatches are recalculated with different rules in the UI;
- raw enum values appear where a canonical human-readable label exists;
- filters alter the underlying counts rather than only the displayed subset;
- a participant from another session enters the overview.

### Completion criteria

- [ ] The facilitator can understand room state in one screen.
- [ ] Every attention flag is factual, deterministic, and explainable.
- [ ] No ranking or competence inference exists.
- [ ] Stage position remains explicitly descriptive.
- [ ] Filters and drill-down actions preserve session isolation.
- [ ] Documentation lists the exact attention rules.
- [ ] Fresh tests and build pass when run by the human.

### Human-run verification commands

```powershell
npm test -- src/facilitatorOperations.test.ts
npm test -- src/engine.test.ts
npm test -- src/branding.test.js
npm test
npm run build
```

Manual browser gate:

1. Load a rehearsal with participants distributed across several stages.
2. Confirm stage totals match the participant table and are labeled as working positions.
3. Create one pending request, one inactive participant, and one submitted mismatch.
4. Confirm each appears as a separate reason without a score or rank.
5. Use each drill-down action and confirm it opens the correct existing surface.

### Human-run commit commands

```powershell
git status --short
git diff --check
git diff -- src/FacilitatorApp.tsx src/engine.ts src/scenario.ts src/types.ts src/styles.css src/facilitatorOperations.test.ts src/engine.test.ts src/branding.test.js docs/PRODUCT_CONTRACT.md
git add -- src/FacilitatorApp.tsx src/engine.ts src/scenario.ts src/types.ts src/styles.css src/facilitatorOperations.test.ts src/engine.test.ts src/branding.test.js docs/PRODUCT_CONTRACT.md
git commit -m "Add facilitator live attention overview"
```

---

## Prompt 5 - Make communications, evidence release, and injects operationally safe

### Objective

Improve the facilitator's intervention tools so exceptional replies, early evidence release, and all-participant injects are easy to review, hard to send accidentally, and transparent after delivery.

### Read first

- `src/FacilitatorApp.tsx`
- `src/ParticipantApp.tsx`
- `src/data.ts`
- `src/scenario.ts`
- `src/types.ts`
- `src/styles.css`
- `src/advisorResearch.test.js`
- `src/branding.test.js`
- `docs/PRODUCT_CONTRACT.md`

### Implementation requirements

1. Split the communications queue into clear Pending and Answered views with counts.
2. For each pending exceptional request show:
   - participant;
   - selected institution;
   - request time and age;
   - the participant's exact question;
   - a concise institution-role boundary;
   - the unsent draft;
   - the final reply preview.
3. Do not auto-generate institutional answers and do not expose canonical evidence that the participant has not received.
4. Preserve a reply draft when send fails or the background refresh fails.
5. Disable only the request currently being sent. Other requests remain readable.
6. Give evidence requests explicit states:
   - `Within authored delay`;
   - `Available by authored timing`;
   - `Released early by facilitator`.
7. Before early release, confirm the participant, evidence title, original availability time, and the fact that the evidence will become immediately available for subsequent decisions and submissions.
8. Do not add bulk early release unless an explicit later prompt authorizes it.
9. Add an inject preview and confirmation that names the audience as all participants in the selected session.
10. Show sent inject history with timestamp and delivery scope. Do not imply that viewing an inject caused a decision.
11. Keep the title/body limits and canonical presets. Do not create a general notification composer.
12. Ensure success appears only after the database mutation and required activity event succeed.
13. Add bounded live announcements for completed sends/releases without announcing every polling refresh.
14. Update operator documentation for reply, release, and broadcast failure recovery.

### Test requirements

Add or update tests that fail if:

- answered requests obscure pending work by default;
- a failed reply clears its draft;
- an early release lacks participant/evidence/timing confirmation;
- evidence available by authored timing is mislabeled as facilitator-released;
- a facilitator can release evidence for the wrong request/session;
- an inject is broadcast without an all-participant preview;
- sent inject history implies causation;
- any response helper leaks unreleased Kuvera facts;
- a mutation is shown as successful when its required activity event failed.

### Completion criteria

- [ ] Pending requests are easy to triage by institution and age.
- [ ] Reply drafts survive failures.
- [ ] Early release states and consequences are explicit.
- [ ] Injects have preview, confirmation, history, and error recovery.
- [ ] Participant evidence boundaries remain intact.
- [ ] Actions remain participant/session scoped and auditable.
- [ ] Fresh tests and build pass when run by the human.

### Human-run verification commands

```powershell
npm test -- src/advisorResearch.test.js
npm test -- src/facilitatorOperations.test.ts
npm test -- src/branding.test.js
npm test
npm run build
```

Manual browser gate:

1. Send exceptional requests from two participants to different institutions.
2. Draft both replies, force one send failure, and confirm both drafts remain.
3. Send one reply and confirm its pending count changes exactly once.
4. Request evidence, release it early, and confirm the participant sees it immediately with the correct timestamp semantics.
5. Send an inject after preview and confirm it appears in history and both participant rooms.

### Human-run commit commands

```powershell
git status --short
git diff --check
git diff -- src/FacilitatorApp.tsx src/ParticipantApp.tsx src/data.ts src/scenario.ts src/types.ts src/styles.css src/advisorResearch.test.js src/facilitatorOperations.test.ts src/branding.test.js docs/PRODUCT_CONTRACT.md README.md
git add -- src/FacilitatorApp.tsx src/ParticipantApp.tsx src/data.ts src/scenario.ts src/types.ts src/styles.css src/advisorResearch.test.js src/facilitatorOperations.test.ts src/branding.test.js docs/PRODUCT_CONTRACT.md README.md
git commit -m "Improve facilitator intervention workflows"
```

---

## Prompt 6 - Turn Replay & Debrief into a version-aware facilitation workspace

### Objective

Make the debrief view support live reconstruction and discussion instead of duplicating the export panel.

### Read first

- `src/FacilitatorApp.tsx`
- `src/engine.ts`
- `src/report.ts`
- `src/scenario.ts`
- `src/types.ts`
- `src/styles.css`
- `src/engine.test.ts`
- `src/branding.test.js`
- `docs/PRODUCT_CONTRACT.md`

### Implementation requirements

1. Give `Replay & Debrief` a distinct job. Do not render the same export card as both analytics and replay without additional functionality.
2. Add a facilitator-only reconstruction workspace with:
   - participant selector;
   - submitted-version selector;
   - replay provenance badge: frozen, legacy reconstruction, or working state;
   - submitted position and negotiation-preparation brief;
   - evidence available at that version;
   - evidence requested but not yet available at that version;
   - deterministic recommendation review;
   - consequences and unresolved risks;
   - one fixed-assumption counterfactual;
   - relevant facilitator injects and institutional replies;
   - transfer reflection when present.
3. Default to the latest submitted version, not current unsent working edits.
4. If a participant has no submission, label the view `Working state - not a submitted replay` and keep it visually distinct.
5. Keep frozen reconstruction driven by the existing engine helpers. Do not duplicate replay logic in the component.
6. Keep legacy rows explicitly labeled. Do not mint a frozen snapshot or imply submission-time certainty for them.
7. Add a persistent debrief run sheet containing the five existing sequence steps.
8. Provide anonymous pathway grouping for group discussion. Group by deterministic decision path, not participant identity, writing quality, or inferred quality.
9. Let the facilitator move from an anonymous pathway to an identified individual report only through an explicit facilitator-only action.
10. Keep exports available, but place them after reconstruction rather than making them the primary replay experience.
11. Ensure switching participant or version changes only the selected reconstruction and never mutates stored data.
12. Avoid building every full AAR on each polling render. Build the selected reconstruction lazily.

### Test requirements

Add or update tests that fail if:

- replay defaults to unsent working edits when a submission exists;
- later evidence, injects, replies, or edits enter an earlier frozen replay;
- a legacy reconstruction is labeled frozen;
- changing versions mutates a submission or participant record;
- anonymous pathway grouping includes participant identity;
- a working state is called a submitted replay;
- the UI reimplements consequence or evidence-availability rules outside the engine;
- all participant AARs are eagerly rebuilt on every polling render.

### Completion criteria

- [ ] Replay & Debrief is operationally distinct from exports.
- [ ] The facilitator can reconstruct any submitted version with provenance visible.
- [ ] Working, frozen, and legacy states are never conflated.
- [ ] Anonymous group comparison remains non-ranking.
- [ ] The run sheet supports the intended causal debrief sequence.
- [ ] Selection is read-only and cannot alter historical replay.
- [ ] Fresh replay tests and build pass when run by the human.

### Human-run verification commands

```powershell
npm test -- src/engine.test.ts
npm test -- src/facilitatorOperations.test.ts
npm test -- src/branding.test.js
npm test
npm run build
```

Manual browser gate:

1. Create two versions for one participant with evidence arriving between them.
2. Begin debrief and switch between versions.
3. Confirm each version retains its own evidence, recommendation review, consequence, and provenance.
4. Open a legacy fixture and confirm its reconstruction label.
5. Compare pathways anonymously, then deliberately open one identified AAR.
6. Confirm no selection changes the participant's current or submitted record.

### Human-run commit commands

```powershell
git status --short
git diff --check
git diff -- src/FacilitatorApp.tsx src/engine.ts src/report.ts src/scenario.ts src/types.ts src/styles.css src/engine.test.ts src/facilitatorOperations.test.ts src/branding.test.js docs/PRODUCT_CONTRACT.md
git add -- src/FacilitatorApp.tsx src/engine.ts src/report.ts src/scenario.ts src/types.ts src/styles.css src/engine.test.ts src/facilitatorOperations.test.ts src/branding.test.js docs/PRODUCT_CONTRACT.md
git commit -m "Build facilitator replay workspace"
```

---

## Prompt 7 - Clarify exports, privacy, closing, deletion, and audit truth

### Objective

Make high-impact lifecycle and data-export actions precise, recoverable where possible, and honest about what is retained or deleted.

### Read first

- `src/FacilitatorApp.tsx`
- `src/data.ts`
- `src/report.ts`
- `src/types.ts`
- `src/styles.css`
- all Supabase migrations defining session deletion, cascades, activity events, and retention
- `src/data.test.js`
- `src/engine.test.ts`
- `src/branding.test.js`
- `docs/PRODUCT_CONTRACT.md`
- `docs/PRIVACY_NOTICE.md`
- `docs/DEPLOYMENT.md`

### Implementation requirements

1. Separate exports into two visibly different groups:
   - anonymous workshop comparison;
   - identified facilitator records.
2. The anonymity control must state exactly which formats and fields it affects.
3. Do not place `CSV with roster` or identified JSON under an anonymity control that does not affect them.
4. Before an identified export, show a concise confirmation naming included personal data and the facilitator-only handling requirement.
5. Include replay provenance and selected submission version in every applicable export.
6. Handle popup blocking, Blob creation, and download failures visibly.
7. Replace immediate session closing with an accessible confirmation that states:
   - submissions will close;
   - the clock will stop;
   - participant records remain until retention expiry or deletion;
   - whether reopening is supported. Do not imply reversibility if the UI cannot perform it.
8. Require typed join-code confirmation before deletion.
9. Deletion must remain possible without forcing an export; privacy deletion cannot depend on downloading another copy.
10. Surface deletion failure and retain the selected session until the server confirms deletion.
11. Audit the current mutation/event ordering. For actions described as audited, ensure the operational mutation and required event cannot report partial success. Use a narrowly scoped RPC or transaction where necessary rather than client-side wishful thinking.
12. Determine and document deletion audit truth:
   - if session deletion cascades through activity records, say that no in-platform session audit remains;
   - do not claim immutable audit retention unless a separate, privacy-reviewed mechanism actually exists.
13. Keep the 30-day retention promise and early-deletion contract synchronized across migration/runtime/docs.
14. Do not add external storage or upload generated reports back to the platform.

### Test requirements

Add or update tests that fail if:

- an identified export is presented as anonymized;
- a roster or transcript can be exported without facilitator-only disclosure;
- an export omits replay provenance where applicable;
- Close executes without confirmation;
- Delete accepts confirmation text other than the exact selected join code;
- a failed deletion removes the session from the UI;
- docs claim an audit artifact survives deletion when cascades remove it;
- a mutation reports success while its required audit event failed;
- retention durations diverge across code, database, and privacy documentation.

### Completion criteria

- [ ] Anonymous and identified exports are unmistakably different.
- [ ] Export contents and handling expectations are explicit.
- [ ] Close and Delete state exact effects before execution.
- [ ] Deletion requires typed confirmation and remains failure-visible.
- [ ] Audit and retention claims match actual persistence behavior.
- [ ] No new external report-storage surface exists.
- [ ] Fresh tests, migration checks, and build pass when run by the human.

### Human-run verification commands

```powershell
npm test -- src/data.test.js
npm test -- src/engine.test.ts
npm test -- src/facilitatorOperations.test.ts
npm test -- src/branding.test.js
npm test
npm run build
```

If a disposable local Supabase environment is configured and migrations changed:

```powershell
supabase db reset
```

Manual browser gate:

1. Generate an anonymous comparison and inspect it for participant identity.
2. Generate each identified format and confirm the disclosure precedes download.
3. Block popups/downloads and confirm an actionable error appears.
4. Cancel Close, then confirm Close and inspect participant behavior.
5. Attempt Delete with incorrect text, cancel once, then delete with the exact join code.
6. Force a deletion failure and confirm the session remains selected and visible.

### Human-run commit commands

```powershell
git status --short
git diff --check
git diff -- src/FacilitatorApp.tsx src/data.ts src/report.ts src/types.ts src/styles.css supabase/migrations src/data.test.js src/engine.test.ts src/facilitatorOperations.test.ts src/branding.test.js docs/PRODUCT_CONTRACT.md docs/PRIVACY_NOTICE.md docs/DEPLOYMENT.md
git add -- src/FacilitatorApp.tsx src/data.ts src/report.ts src/types.ts src/styles.css supabase/migrations src/data.test.js src/engine.test.ts src/facilitatorOperations.test.ts src/branding.test.js docs/PRODUCT_CONTRACT.md docs/PRIVACY_NOTICE.md docs/DEPLOYMENT.md
git commit -m "Harden facilitator exports and lifecycle controls"
```

---

## Prompt 8 - Meet cohort-scale, accessibility, mobile, and bundle-performance gates

### Objective

Ensure the completed facilitator workflow remains responsive, keyboard-operable, legible, and reliable for the contracted 20-50 participant cohort without hiding build warnings.

### Read first

- `src/FacilitatorApp.tsx`
- `src/data.ts`
- `src/report.ts`
- `src/styles.css`
- `src/main.tsx`
- `src/types.ts`
- `src/branding.test.js`
- `vite.config.ts`
- `package.json`
- `docs/PRODUCT_CONTRACT.md`
- `docs/DEPLOYMENT.md`

### Implementation requirements

1. Measure the facilitator's current refresh/query behavior with a 50-participant rehearsal fixture before changing it. Record query count, transferred rows, refresh duration, and report-build cost without inventing results.
2. Stop reloading unbounded session history every three seconds.
3. Prefer existing Supabase realtime support or bounded incremental refreshes for changed operational records. Keep a slower reconciliation refresh so dropped realtime messages do not create permanent drift.
4. Scope every subscription/query to the selected session and clean it up on session change or unmount.
5. Paginate or progressively render participant-heavy views if measurement shows it is needed. Do not add pagination merely for decoration.
6. Build full AARs and export payloads lazily for the selected participant/action rather than for the entire roster on every render.
7. Dynamically load heavy export dependencies when an export is requested. Do not raise `chunkSizeWarningLimit` or suppress the warning as a substitute for reducing the initial bundle.
8. Record the resulting production chunk sizes and compare them with the starting approximately 655 kB main chunk.
9. On keyboard navigation:
   - move focus to the active view heading after navigation;
   - preserve a logical tab order;
   - keep visible focus indicators;
   - trap and restore focus in all confirmation/report dialogs;
   - support Escape only where a visible close/cancel action exists.
10. On dynamic updates:
   - announce action success/failure and stale/live transitions;
   - do not announce every poll, timer tick, or participant heartbeat;
   - preserve textual state labels so color is never the only signal.
11. At 200% zoom and tablet/mobile widths:
   - keep session lifecycle controls reachable;
   - provide a usable alternative to the wide participant table;
   - preserve request/reply drafts;
   - avoid overlapping sticky navigation and dialogs;
   - keep touch targets at least 40 px, with primary mobile actions at 44 px where practical.
12. Respect reduced motion and do not add decorative live-dashboard animation.
13. Add explicit loading, empty, error, retry, stale, and degraded states to every new facilitator surface.
14. Update deployment documentation with the measured cohort and browser matrix. Do not claim broad accessibility conformance from automated tests alone.

### Test requirements

Add or update tests that fail if:

- facilitator data is queried without the selected session ID;
- a session switch leaves the prior subscription active;
- a dropped realtime event cannot be reconciled;
- all AARs are eagerly built on routine refresh;
- heavy PDF/export code remains in the initial facilitator path when it can be loaded on demand;
- view changes leave keyboard focus in the inactive navigation control;
- live regions announce every timer/poll update;
- status depends on color alone;
- critical controls become unreachable at the supported mobile/tablet breakpoints;
- reduced-motion preferences hide content or functionality.

Add a reproducible 50-participant fixture or bounded measurement script only if it is needed for the performance evidence. Do not commit generated participant PII or large build artifacts.

### Completion criteria

- [ ] The facilitator console remains responsive with 50 participants.
- [ ] Refresh traffic is bounded and session-scoped.
- [ ] Realtime/incremental state has a reconciliation path.
- [ ] AAR and export work is lazy.
- [ ] The production bundle warning is reduced through real code splitting or remains an explicit measured advisory with a documented blocker.
- [ ] Keyboard, zoom, mobile, stale-data, and reduced-motion behavior pass the manual matrix.
- [ ] Deployment documentation records actual evidence rather than claims.
- [ ] Fresh tests and production build pass when run by the human.

### Human-run verification commands

```powershell
npm test -- src/facilitatorOperations.test.ts
npm test -- src/branding.test.js
npm test
npm run build
```

Manual browser and performance gate:

1. Load a 50-participant rehearsal fixture in the facilitator console.
2. Exercise overview filters, participant drill-down, communications, evidence release, replay, and exports.
3. Switch sessions repeatedly and inspect active subscriptions and network requests.
4. Drop and restore connectivity to verify stale and reconciliation behavior.
5. Complete the workflow with keyboard only at desktop width.
6. Repeat critical controls at 200% zoom and a tablet/mobile viewport.
7. Enable reduced motion and confirm no information disappears.
8. Record Chrome/Edge browser versions, viewport sizes, refresh timings, query counts, and final bundle chunks.

### Human-run commit commands

```powershell
git status --short
git diff --check
git diff -- src/FacilitatorApp.tsx src/data.ts src/report.ts src/styles.css src/main.tsx src/types.ts src/facilitatorOperations.test.ts src/branding.test.js vite.config.ts package.json docs/PRODUCT_CONTRACT.md docs/DEPLOYMENT.md
git add -- src/FacilitatorApp.tsx src/data.ts src/report.ts src/styles.css src/main.tsx src/types.ts src/facilitatorOperations.test.ts src/branding.test.js vite.config.ts package.json docs/PRODUCT_CONTRACT.md docs/DEPLOYMENT.md
git commit -m "Complete facilitator scale and accessibility gates"
```

---

## Final integrated facilitator completion gate

Do not describe the facilitator interface as complete until every applicable prompt has passed its individual gate and the following integrated walkthrough succeeds at the same current head.

### Integrated setup and preflight

1. Sign in through the authorized facilitator flow.
2. Create a rehearsal session and copy the join code using the accessible Copy action.
3. Join multiple participant browsers, including one legacy/not-reported preparation fixture if available.
4. Confirm live/stale synchronization state and the preflight counts.
5. Complete preparation for some participants and verify the counts change once without inference.
6. Start casework after acknowledging any not-reported preparation state.

### Integrated live facilitation

1. Browse previous and future cue cards without changing participant access.
2. Unlock all eight stages sequentially and confirm participant navigation updates.
3. Pause and resume the casework clock.
4. Let a rehearsal clock reach zero and confirm the facilitator retains the explicit next decision.
5. Confirm the live overview counts, stage distribution, and needs-attention reasons against participant records.
6. Send two exceptional institutional requests, reply to one, and recover from one forced failure without losing its draft.
7. Request routine evidence, allow one item to arrive by authored timing, and release another early after confirmation.
8. Preview and send an inject, then verify its history and participant delivery.
9. Confirm no view scores, ranks, or infers competence.

### Integrated debrief and replay

1. Submit at least two versions for one participant with evidence changing between versions.
2. Begin debrief with at least one other participant unresolved or unsubmitted.
3. Confirm the transition closes submissions, pauses the clock, and opens participant debrief.
4. Reconstruct each submitted version and verify frozen evidence, decisions, consequences, and provenance.
5. Inspect a working-state participant and a legacy reconstruction without conflating either with a frozen submission.
6. Compare pathways anonymously and discuss one fictional consequence and one fixed-assumption counterfactual.
7. Record and inspect a participant transfer reflection.

### Integrated export and lifecycle

1. Export an anonymous comparison and confirm it contains no participant identity.
2. Export each identified format after its privacy disclosure and verify replay provenance.
3. Cancel session closing once, then close deliberately and inspect participant behavior.
4. Attempt deletion with the wrong confirmation, then force a failed deletion and confirm the session remains visible.
5. Delete a disposable rehearsal with the exact join code and confirm the documented deletion/audit truth.

### Integrated accessibility and scale

1. Repeat the core facilitator journey with keyboard only.
2. Verify focus entry/return for confirmations and reports.
3. Verify live regions announce actions and stale/live changes without timer/poll noise.
4. Repeat critical tasks at 200% zoom and supported tablet/mobile widths.
5. Enable reduced motion.
6. Run the 50-participant measurement and record actual query, timing, and bundle evidence.

### Final human-run verification commands

```powershell
git status --short
git diff --check
npm test
npm run build
```

If a disposable local Supabase environment is configured and any prompt added migrations:

```powershell
supabase db reset
```

### Final release evidence

Record without inventing:

- exact commit SHA;
- migration versions applied;
- targeted and full test output;
- production-build output and chunk sizes;
- browser and viewport matrix;
- 50-participant query/refresh measurements;
- accessibility checks performed and tools used;
- deletion and retention behavior observed;
- any remaining blocker or advisory issue.
