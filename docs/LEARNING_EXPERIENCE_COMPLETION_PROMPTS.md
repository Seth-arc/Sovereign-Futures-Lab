# Sovereign Futures Lab — Learning Experience Completion Prompts

## Purpose

This handbook converts the learning-experience audit into a sequenced implementation queue. Each prompt is intended to be handed to a coding agent as a self-contained task.

The goal is not to add more platform surface area. The goal is to turn the existing workshop into a coherent, minimalist learning experience that introduces participants to the Sovereign method:

> evidence → uncertainty → decision → consequence → reflection

## Fixed product decisions

These decisions apply to every prompt in this handbook:

- Assume participants are new to sovereign-debt restructuring and may also be new to policy simulations.
- The capability promise is **negotiation preparation**, not live negotiation or bargaining performance.
- Orientation and the Learning Bridge happen before casework.
- The 20-minute clock applies to casework only.
- The exercise should demonstrate decision support, negotiation preparation, strategic synthesis, and reflective learning.
- Do not add participant scoring, ranking, inferred competence, multiplayer negotiation, additional participant roles, or a general scenario-authoring system.
- Preserve the DMO authority boundary. Participants prepare an evidence-bounded recommendation; they do not create a sovereign commitment or creditor assurance.
- Preserve the deterministic boundary. AI advisors may explain participant-visible material but may not choose, alter, validate, or submit a decision.
- Prefer clearer sequencing, better copy, and stronger state semantics over new screens or frameworks.
- Preserve the current React, TypeScript, Vite, Supabase, and vanilla CSS stack.

## Required implementation discipline

For every prompt:

1. Read every named file before editing.
2. Make the narrowest change that closes the named learning-experience gap.
3. Update code, tests, and documentation together.
4. Do not claim tests passed unless the human has run them.
5. Do not change unrelated visual details or refactor unrelated code.
6. Preserve privacy, retention, advisor-source, and non-scoring contracts.
7. If the requested behavior cannot be completed safely within the named scope, document the blocker rather than simulating completion.

The coding agent creates and edits files. The human operator runs verification and commit commands.

## Prompt status

The agent updates this table only after running the prompt's completion gate.

| Prompt | Outcome | Status |
|---|---|---|
| 1 | Preparation sequence and casework clock boundary | Not started |
| 2 | Evidence integrity and answer-leakage removal | Automated gate passed (57/57 tests; production build); manual browser gate pending |
| 3 | Novice-facing value proposition and copy system | Complete (63/63 tests; production build; manual copy gate confirmed) |
| 4 | Evidence-supported recommendation review | Not started |
| 5 | Negotiation-preparation brief | Not started |
| 6 | Participant debrief and learning transfer | Not started |
| 7 | Facilitator instructional guidance | Not started |
| 8 | Mobile and accessibility completion | Not started |
| 9 | Submission snapshot and replay integrity | Not started |
| 10 | Scenario-content consolidation and regression protection | Not started |

---

## Prompt 1 — Make preparation a coherent prerequisite to casework

### Objective

Create one clear pre-case sequence:

1. Orientation
2. Learning Bridge
3. Casework readiness handoff
4. Twenty-minute casework

Orientation and the Learning Bridge must not consume the casework clock. The participant should always know whether they are preparing, waiting for the facilitator, or working inside the timed case.

### Read first

- `docs/PRODUCT_CONTRACT.md`
- `src/ParticipantApp.tsx`
- `src/ReferenceExperience.tsx`
- `src/scenario.ts`
- `src/styles.css`
- `public/kuvera_debt_management_office.html`
- `src/branding.test.js`

### Implementation requirements

1. Change the first-run participant sequence so completing Orientation opens the Learning Bridge rather than returning directly to the decision room.
2. Completing the Learning Bridge must return the participant to the live room at the Mandate stage.
3. Retain explicit Skip and Close controls, but make their consequence clear:
   - `Skip for now` returns to a preparation state, not a falsely completed state.
   - A participant can reopen and complete preparation without losing casework data.
4. Use one honest duration label for the Learning Bridge: `About 6 minutes`.
5. Tell participants explicitly that the 20-minute casework clock starts only when the facilitator begins the exercise.
6. Keep the institutional case deadlines separate from the workshop clock:
   - USD 750m maturity in six weeks.
   - IMF Board horizon in eleven weeks.
   - Do not imply that one real-time second represents a fixed number of scenario days or weeks.
7. When the workshop clock is not running, label it `Casework · 20:00 · waiting` or an equally clear equivalent.
8. Do not add another navigation rail, onboarding page, or participant identity step.
9. Update `docs/PRODUCT_CONTRACT.md` to describe the implemented sequence and timing truth.

### Test requirements

Add or update tests that would fail if:

- Orientation completion closes without opening the Learning Bridge on first entry.
- Learning Bridge completion fails to return to Mandate.
- The preparation copy claims the casework clock is already running.
- The bridge contains conflicting `3–4 minutes` and `about six minutes` labels.
- Normal page refresh unnecessarily restarts preparation after the participant has already entered casework.
- Reopening Orientation or the Learning Bridge resets participant decision data.

Prefer behavioral component tests where feasible. If the current test stack cannot render the embedded reference experience, add the narrowest source-contract test and document the remaining browser verification requirement.

### Completion criteria

- [ ] A new participant moves from Orientation to Learning Bridge to Mandate without having to discover a separate control.
- [ ] The Learning Bridge displays one duration estimate: about six minutes.
- [ ] The casework clock is clearly identified as separate from preparation.
- [ ] Institutional deadlines remain visible as case facts without being presented as a real-time clock conversion.
- [ ] Skipping preparation does not mark it complete.
- [ ] Reopening preparation does not reset working decisions.
- [ ] Product documentation matches the implemented sequence.
- [ ] Relevant tests and the production build pass when run by the human operator.

### Human-run test commands

```powershell
npm test -- src/branding.test.js
npm test
npm run build
```

Manual browser gate after `npm run dev`:

1. Join as a new participant.
2. Complete Orientation and confirm the Learning Bridge opens automatically.
3. Complete the bridge and confirm Mandate opens.
4. Reopen Orientation and the bridge from the participant controls.
5. Refresh during casework and confirm the participant returns to their room without forced preparation.
6. Confirm the displayed casework time remains 20:00 while the facilitator has not started it.

Pass means the complete sequence works with no decision-state loss and no contradictory time language.

### Human-run commit commands

Review the actual changed-file list before staging. Adjust the `git add` list if the implementation legitimately touched fewer or additional prompt-scoped files.

```powershell
git status --short
git diff --check
git diff -- src/ParticipantApp.tsx src/ReferenceExperience.tsx src/styles.css public/kuvera_debt_management_office.html src/branding.test.js docs/PRODUCT_CONTRACT.md
git add -- src/ParticipantApp.tsx src/ReferenceExperience.tsx src/styles.css public/kuvera_debt_management_office.html src/branding.test.js docs/PRODUCT_CONTRACT.md
git commit -m "Complete participant preparation sequence"
```

---

## Prompt 2 — Remove answer leakage and restore evidence discovery

### Objective

Ensure participants must establish Kuvera's conclusions from role-appropriate evidence. The Case File and decision options may teach what to examine, but they must not reveal the canonical answer before the relevant evidence returns.

### Read first

- `docs/PRODUCT_CONTRACT.md`
- `src/ParticipantApp.tsx`
- `src/scenario.ts`
- `src/engine.ts`
- `src/data.ts`
- `src/types.ts`
- `public/kuvera_debt_management_office.html`
- `supabase/functions/advisor-chat/index.ts`
- `src/engine.test.ts`
- `src/advisorResearch.test.js`

### Implementation requirements

1. Audit every participant-visible statement concerning:
   - USD 780m reported liquidity.
   - USD 240m restricted balance.
   - USD 60m protected balance.
   - USD 480m usable liquidity.
   - RA-01 account control.
   - Facility A/B linkage.
   - Confidentiality and permitted disclosure.
   - Creditor commitment status.
2. Before evidence returns, the Case File may establish only the initial information state. For example:
   - USD 780m is reported.
   - A partial memo indicates possible restrictions.
   - Facility A references RA-01.
   - Facility B's relationship to the account remains unconfirmed.
   - Disclosure permission remains unresolved.
3. Remove or revise Case File diagrams and matrices that expose USD 480m, the shared-pool conclusion, or the permitted redacted disclosure before evidence is returned.
4. Keep research-method transparency, but move exact exercise answers out of the static Evidence Basis section.
5. Rewrite decision-option details so they describe the claim or action being recorded, not why it is correct. Avoid details such as `Both facilities depend on RA-01` inside the option itself.
6. Do not disable honest unresolved choices. Participants must remain able to preserve uncertainty.
7. Ensure advisor baseline context contains only facts already available to every participant. Evidence-specific facts must remain conditional on returned or facilitator-released evidence.
8. Preserve the approved research-card hierarchy and citation system.
9. Update the product contract to name the information boundary between:
   - shared case context;
   - requested and returned institutional evidence;
   - facilitator replies;
   - research that explains but does not establish Kuvera facts.

### Test requirements

Add tests that would fail if:

- The static Case File exposes the USD 480m result before Treasury reconciliation.
- The static Case File states that Facility B shares RA-01 as an established participant fact.
- A decision option explains that the shared-pool or redacted-disclosure answer is correct.
- The AI advisor receives evidence-specific facts before the corresponding response is available.
- Returned evidence is omitted from the advisor context after it becomes available.
- An unresolved option is removed or blocked.

### Completion criteria

- [ ] A participant cannot learn the exact usable-liquidity result from the static Case File.
- [ ] Facility B linkage remains unresolved until the relevant evidence is available.
- [ ] Disclosure permission remains unresolved until the legal opinion or authorized reply is available.
- [ ] Choice copy no longer contains the rationale for the canonical path.
- [ ] AI advisors respect the same information boundary as the UI.
- [ ] Parallel Learning Bridge examples still teach the reasoning pattern without revealing Kuvera's answers.
- [ ] Tests pin both pre-evidence and post-evidence behavior.
- [ ] Documentation matches the implemented information boundary.

### Human-run test commands

```powershell
npm test -- src/advisorResearch.test.js
npm test -- src/engine.test.ts
npm test -- src/branding.test.js
npm test
npm run build
```

Manual browser gate:

1. Enter the case without requesting evidence.
2. Inspect all six Case File sections and both advisors.
3. Confirm the exact liquidity, linkage, and disclosure conclusions are not available.
4. Request and await each relevant evidence item.
5. Confirm the returned evidence and advisor explanations now expose only the corresponding established facts.

Pass means the correct path must be reasoned from evidence rather than recognized from static copy.

### Human-run commit commands

```powershell
git status --short
git diff --check
git diff -- src/ParticipantApp.tsx src/scenario.ts src/engine.ts src/data.ts public/kuvera_debt_management_office.html supabase/functions/advisor-chat/index.ts src/engine.test.ts src/advisorResearch.test.js src/branding.test.js docs/PRODUCT_CONTRACT.md
git add -- src/ParticipantApp.tsx src/scenario.ts src/engine.ts src/data.ts public/kuvera_debt_management_office.html supabase/functions/advisor-chat/index.ts src/engine.test.ts src/advisorResearch.test.js src/branding.test.js docs/PRODUCT_CONTRACT.md
git commit -m "Restore evidence discovery in the Kuvera case"
```

---

## Prompt 3 — Rewrite the product and participant copy for domain newcomers

### Objective

Replace system-centered, prototype-centered, and specialist-first language with concise participant language. Make the platform's value immediately understandable without diminishing the research and governance rigor behind it.

### Read first

- `index.html`
- `about.html`
- `docs/PRODUCT_CONTRACT.md`
- `docs/PRIVACY_NOTICE.md`
- `src/ParticipantApp.tsx`
- `src/ReferenceExperience.tsx`
- `src/scenario.ts`
- `public/kuvera_debt_management_office.html`
- `src/branding.test.js`

### Required message hierarchy

Use this hierarchy consistently:

- **Platform:** Sovereign
- **Experience:** Futures Lab
- **Workshop:** A Data-Informed Simulation for African Foresight Practice
- **Case:** Kuvera Financing Assurances
- **Participant role:** Debt Management Office

Do not show all five labels in every surface. Each surface should show only the context needed there.

### Required value proposition

Use this proposition or a demonstrably clearer equivalent on the landing experience:

> **Practise decisions that can withstand uncertainty.**
>
> Work through a high-stakes sovereign-finance case, test what the evidence supports, prepare a negotiation-ready recommendation, and see how your choices shape the outcome.

The supporting value language should express:

- Decision support: separate facts, assumptions, and unresolved risks.
- Negotiation preparation: build a position grounded in evidence and authority.
- Strategic intelligence: connect financial, contractual, and institutional signals.
- Reflection: reconstruct what changed the decision and why.

### Implementation requirements

1. Rewrite the landing subtitle and About content so participant outcomes come before RTLF, engine, runtime, or architecture explanations.
2. Retain a concise secondary section explaining the research-to-decision architecture for funders, researchers, and technical partners.
3. Replace participant-facing terms such as:
   - `internal role partition` → `your role in the ministry team`;
   - `authored delay` → `this response takes time to obtain`;
   - `participant-visible evidence` → `evidence available in your case record`;
   - `bounded recommendation` → `a recommendation that states what is known, unknown, and conditional`;
   - `deterministic counterfactual pathway` → `what would have changed if you had acted differently`;
   - `demo calibration` → `exercise-only assumption`;
   - `AAR` → `after-action review` or `debrief record`.
4. Remove participant-facing instructions addressed to designers or developers, including:
   - `the demo should...`;
   - `the interface must...`;
   - `scenario mechanic used to...`;
   - `make RTL-... executable`.
5. Keep necessary provenance language, but present human-readable source titles, classifications, and page references before internal IDs.
6. Introduce specialist terms in plain language before using acronyms. At minimum cover DMO, OCC, financing assurance, treatment perimeter, effective control, and Comparability of Treatment.
7. Use direct participant verbs: inspect, request, compare, record, recommend, revise, reflect.
8. Correct punctuation or spacing errors in `about.html`, including missing spaces after sentence-ending periods.
9. Do not weaken privacy, evidence-boundary, legal-boundary, or fictional-scenario disclosures.

### Test requirements

Add source-contract tests for:

- The required participant value proposition.
- Removal of identified prototype/developer phrases from participant-visible surfaces.
- Consistent naming of platform, experience, workshop, case, and role.
- Expansion of specialist acronyms at first use in the relevant surface.
- Continued presence of privacy and fictional-scenario disclosures.

Tests should not pin entire paragraphs or exact layout dimensions unless required for a safety or product contract. Prefer testing the presence or absence of critical semantic phrases.

### Completion criteria

- [ ] A domain newcomer can identify the role, decision, stakes, and expected output from the landing and entry copy.
- [ ] The platform promises negotiation preparation rather than negotiation performance.
- [ ] Decision support and strategic intelligence are described through participant actions, not architecture jargon.
- [ ] No participant surface contains developer instructions or prototype language.
- [ ] The About experience begins with participant and institutional value.
- [ ] Technical architecture remains available as secondary explanatory material.
- [ ] Naming is consistent across landing, workshop, case file, advisor, and facilitator surfaces.
- [ ] Tests and documentation reflect the new copy contract.

### Human-run test commands

```powershell
npm test -- src/branding.test.js
npm test
npm run build
```

Manual copy gate:

1. Read the landing, About, Orientation, Bridge, role brief, Case File, recommendation, reflection, and advisor introductions in sequence.
2. Confirm no surface requires knowledge of RTLF or internal claim identifiers to understand the task.
3. Confirm the research and inference boundaries remain accurate.

Pass means a newcomer can explain the experience in one sentence without referring to platform architecture.

### Human-run commit commands

```powershell
git status --short
git diff --check
git diff -- index.html about.html src/ParticipantApp.tsx src/ReferenceExperience.tsx src/scenario.ts public/kuvera_debt_management_office.html src/branding.test.js docs/PRODUCT_CONTRACT.md docs/PRIVACY_NOTICE.md
git add -- index.html about.html src/ParticipantApp.tsx src/ReferenceExperience.tsx src/scenario.ts public/kuvera_debt_management_office.html src/branding.test.js docs/PRODUCT_CONTRACT.md docs/PRIVACY_NOTICE.md
git commit -m "Rewrite Futures Lab for domain newcomers"
```

---

## Prompt 4 — Add evidence-support status to the recommendation review

### Objective

Before submission, help participants distinguish between a selected conclusion and a conclusion supported by the evidence available to them. This is decision support, not automated decision-making.

### Read first

- `src/types.ts`
- `src/scenario.ts`
- `src/engine.ts`
- `src/ParticipantApp.tsx`
- `src/data.ts`
- `src/report.ts`
- `src/engine.test.ts`
- `docs/PRODUCT_CONTRACT.md`

### Implementation requirements

1. Add a pure deterministic function that reviews the current recommendation against evidence available at the review moment.
2. Return an evidence-support status for each material claim:
   - `SUPPORTED` — the required evidence is available and supports the recorded claim.
   - `CONDITIONAL` — some evidence is available, but a named dependency remains open.
   - `UNRESOLVED` — the participant preserved uncertainty or the evidence does not establish a conclusion.
   - `UNSUPPORTED` — the recorded claim exceeds or conflicts with the available evidence.
3. Review at least:
   - liquidity basis;
   - account classification;
   - Facility A/B linkage;
   - disclosure recommendation;
   - treatment perimeter;
   - readiness position.
4. Do not translate these statuses into a score, percentage, pass/fail mark, or competence judgment.
5. Show the review immediately before the Submit control as a compact `Recommendation check`.
6. For each non-supported item, state the missing evidence or unresolved dependency in plain language.
7. Do not block `NOT_READY` or `READY_WITH_CONDITIONS` submissions because evidence is unresolved.
8. If `READY` exceeds the evidence state, allow the participant to revise or submit only if the product contract deliberately permits the mismatch. If submission remains allowed, make the mismatch explicit and retain it in the debrief record.
9. Ensure the review updates when evidence returns or decisions change.
10. Use evidence availability, not merely evidence-request existence.
11. Update the AAR so its evidence-incorporation section uses the same deterministic review function rather than a separate approximation.

### Test requirements

Add unit tests covering:

- USD 480m selected before Treasury evidence is available → unsupported.
- USD 480m selected after Treasury evidence is available → supported.
- Shared-pool selected before Facility B or dependency evidence → unsupported or conditional according to the documented rule.
- Unresolved linkage with no evidence → unresolved, not incorrect.
- Redacted disclosure before legal opinion → conditional or unsupported according to the documented rule.
- `NOT_READY` with unresolved evidence remains a valid submission posture.
- A `READY` recommendation with a blocking unsupported claim produces a visible mismatch.
- AAR evidence-incorporation language matches the recommendation review.

### Completion criteria

- [ ] Every material recommendation claim displays a support status before submission.
- [ ] Statuses depend on evidence available at that moment.
- [ ] The review explains gaps without choosing an answer for the participant.
- [ ] Honest uncertainty remains selectable and submittable.
- [ ] No score, ranking, or competence inference is introduced.
- [ ] The same review logic is used in the participant review and facilitator AAR.
- [ ] Unit tests cover supported, conditional, unresolved, and unsupported states.
- [ ] Product documentation defines the status meanings.

### Human-run test commands

```powershell
npm test -- src/engine.test.ts
npm test
npm run build
```

Manual browser gate:

1. Record conclusions before requesting evidence and inspect the Recommendation check.
2. Return the relevant evidence and confirm the statuses update.
3. Submit a conditional or not-ready recommendation with unresolved evidence.
4. Confirm the facilitator report uses the same status interpretation.

Pass means the interface distinguishes `selected` from `supported` without turning support status into a score.

### Human-run commit commands

```powershell
git status --short
git diff --check
git diff -- src/types.ts src/engine.ts src/ParticipantApp.tsx src/report.ts src/engine.test.ts docs/PRODUCT_CONTRACT.md
git add -- src/types.ts src/engine.ts src/ParticipantApp.tsx src/report.ts src/engine.test.ts docs/PRODUCT_CONTRACT.md
git commit -m "Add evidence support to recommendation review"
```

---

## Prompt 5 — Turn submission into a negotiation-preparation brief

### Objective

Make the participant's final output visibly useful for negotiation preparation. Reuse the existing decision state and add only the smallest missing handoff field.

### Read first

- `src/types.ts`
- `src/ParticipantApp.tsx`
- `src/scenario.ts`
- `src/data.ts`
- `src/engine.ts`
- `src/report.ts`
- `supabase/migrations/202609280001_futureslab.sql`
- `docs/PRODUCT_CONTRACT.md`
- `docs/PRIVACY_NOTICE.md`

### Required brief structure

Present one coherent brief containing:

1. **Position** — ready, ready with conditions, or not ready.
2. **Evidence basis** — the material evidence supporting the position.
3. **Known uncertainties** — unresolved facts or dependencies.
4. **Disclosure boundary** — what may be shared and at what level.
5. **Treatment perimeter** — which facilities are included or deferred.
6. **Conditions to advance** — reuse and relabel `unresolvedRisks` rather than adding a duplicate field.
7. **Next institutional handoff** — add one concise `nextHandoff` field to `DecisionState`.
8. **Recommendation to the Finance Ministry Lead** — reuse `finalRationale` with clearer participant copy.

### Implementation requirements

1. Rename the participant-facing submission surface to `Negotiation-preparation brief` or a similarly accurate name.
2. Do not describe the brief as a negotiation result, agreement, assurance, or sovereign commitment.
3. Generate the evidence-basis summary from evidence actually available, not all evidence requested.
4. Add `nextHandoff` to the decision type, empty state, persistence, submission snapshot, report, export, and local emergency handoff.
5. Keep all structured decisions revisable until submissions close.
6. Retain versioned submissions.
7. Add a compact review layout rather than a new route or editor.
8. Preserve the ability to submit an honest `NOT_READY` brief.
9. Update facilitator exports so the brief can be reconstructed without reading raw JSON.
10. Update the product and privacy contracts if the new field changes retained participant data.

### Test requirements

Add tests that would fail if:

- `nextHandoff` is dropped during local save, cloud save, submission, report generation, or export.
- Requested-but-not-returned evidence appears in the evidence basis.
- The brief calls itself a negotiated outcome or creditor assurance.
- A `NOT_READY` brief cannot be submitted.
- Submission version history omits the handoff field.

### Completion criteria

- [ ] The participant submits one coherent negotiation-preparation brief.
- [ ] The brief uses existing decision data wherever possible.
- [ ] Only one new participant-authored field, `nextHandoff`, is added.
- [ ] Evidence basis reflects evidence available at submission.
- [ ] Conditions and unresolved risks are visible rather than hidden in a generic rationale.
- [ ] The brief clearly remains an internal DMO recommendation.
- [ ] Versioned submissions and all report formats retain the complete brief.
- [ ] Product and privacy documentation match the retained data.

### Human-run test commands

```powershell
npm test -- src/engine.test.ts
npm test
npm run build
```

Manual browser gate:

1. Complete the case with a conditional recommendation.
2. Review the generated brief.
3. Submit two versions with different next handoffs.
4. Open the facilitator AAR and all applicable exports.
5. Confirm both versions remain distinguishable and the current brief is readable without raw JSON.

Pass means the participant leaves casework having produced a defensible preparation artifact, not merely a collection of form fields.

### Human-run commit commands

```powershell
git status --short
git diff --check
git diff -- src/types.ts src/ParticipantApp.tsx src/data.ts src/engine.ts src/report.ts src/engine.test.ts docs/PRODUCT_CONTRACT.md docs/PRIVACY_NOTICE.md
git add -- src/types.ts src/ParticipantApp.tsx src/data.ts src/engine.ts src/report.ts src/engine.test.ts docs/PRODUCT_CONTRACT.md docs/PRIVACY_NOTICE.md
git commit -m "Create negotiation preparation brief"
```

---

## Prompt 6 — Complete the participant debrief and transfer loop

### Objective

Turn the end of the exercise into a learning experience. Participants should see a concise reconstruction of their own decision after submissions close, then record one transfer insight.

### Read first

- `src/ParticipantApp.tsx`
- `src/FacilitatorApp.tsx`
- `src/scenario.ts`
- `src/types.ts`
- `src/engine.ts`
- `src/data.ts`
- `src/report.ts`
- `docs/PRODUCT_CONTRACT.md`

### Implementation requirements

1. Reframe the final stage as `Debrief and transfer`.
2. Before the session enters `DEBRIEF`, show a waiting state that preserves the participant's submitted recommendation and explains that the facilitator will begin the review.
3. When the facilitator selects `Begin debrief`:
   - close submissions;
   - pause the casework clock;
   - update participants through the existing session subscription;
   - make the final stage available;
   - display the participant's debrief view without requiring a page reload.
4. The participant debrief must show only their own record:
   - submitted position and version;
   - evidence available at submission;
   - one or more material consequences;
   - unresolved risks;
   - one deterministic counterfactual with fixed assumptions;
   - facilitator injects that materially affected the record, if any.
5. Do not expose other participants' identities, decisions, transcripts, or detailed AARs.
6. Replace the pre-debrief reflection with a post-debrief transfer prompt:
   - `What will you do differently when preparing a real decision under uncertainty?`
7. Preserve `reflection` as the transfer response unless changing its meaning would corrupt existing records. If a new field is required for backward compatibility, document and test the migration behavior.
8. Allow the participant to save the transfer reflection after submissions close without reopening or mutating the submitted recommendation.
9. Do not present consequences as real-world predictions, scores, or competence findings.
10. Update the product contract to distinguish participant debrief view from facilitator-only AAR.

### Test requirements

Add tests covering:

- Beginning debrief closes submissions and pauses the clock.
- A participant receives the session-status change and can access the final stage without refresh.
- The debrief uses the submitted version rather than later unsent working edits.
- Saving transfer reflection does not mutate the submitted decision snapshot.
- Participant debrief data contains no other participant records.
- Counterfactual copy names its fixed assumptions and fictional boundary.
- Participant debrief remains available after a refresh while the session is in `DEBRIEF`.

### Completion criteria

- [ ] `Begin debrief` produces a participant-visible state change.
- [ ] Participants can inspect their own decision, evidence state, consequence, and counterfactual.
- [ ] Participants record a post-debrief transfer reflection.
- [ ] The submitted recommendation remains immutable while reflection remains savable.
- [ ] No participant can access another participant's detailed record.
- [ ] Consequences and counterfactuals retain their fictional and non-scoring boundaries.
- [ ] Facilitator AAR and participant debrief are clearly distinct.
- [ ] Tests cover the session transition and data boundary.

### Human-run test commands

```powershell
npm test -- src/engine.test.ts
npm test
npm run build
```

Manual two-browser gate:

1. Join a participant in one browser and sign into the facilitator console in another.
2. Submit a participant recommendation.
3. Start debrief from the facilitator console.
4. Confirm the participant view changes without refresh.
5. Save a transfer reflection.
6. Confirm the submission version is unchanged and the reflection appears in the facilitator report.

Pass means the exercise ends with feedback and transfer rather than a message that the facilitator holds the useful record elsewhere.

### Human-run commit commands

```powershell
git status --short
git diff --check
git diff -- src/ParticipantApp.tsx src/FacilitatorApp.tsx src/scenario.ts src/types.ts src/engine.ts src/data.ts src/report.ts src/engine.test.ts docs/PRODUCT_CONTRACT.md
git add -- src/ParticipantApp.tsx src/FacilitatorApp.tsx src/scenario.ts src/types.ts src/engine.ts src/data.ts src/report.ts src/engine.test.ts docs/PRODUCT_CONTRACT.md
git commit -m "Complete participant debrief and transfer"
```

---

## Prompt 7 — Add stage-specific facilitator instructional guidance

### Objective

Give the facilitator enough guidance to deliver a consistent novice learning experience without creating a separate facilitator manual or complex orchestration system.

### Read first

- `src/FacilitatorApp.tsx`
- `src/scenario.ts`
- `src/types.ts`
- `src/styles.css`
- `src/report.ts`
- `docs/PRODUCT_CONTRACT.md`
- `README.md`

### Implementation requirements

1. Add one facilitator guide object per participant stage in `src/scenario.ts` or an equally central scenario-definition file.
2. Each stage guide must contain:
   - learning purpose;
   - one opening question;
   - two or three things to listen for;
   - one likely novice misconception;
   - the condition for unlocking the next stage;
   - one debrief connection.
3. Display the current stage guide inside the existing `Live overview` rather than adding a new route.
4. Keep guidance concise enough to scan while facilitating. Use progressive disclosure for supporting detail.
5. Replace the generic `Current phase · concrete experience` label with language tied to the actual stage and learning purpose.
6. Show participant progress descriptively:
   - joined;
   - preparing;
   - working in stage;
   - submitted;
   - in debrief.
7. Do not describe highest saved stage as stage completion unless completion criteria are actually satisfied.
8. Add a confirmation to `Begin debrief` summarizing that submissions will close and the participant debrief will open.
9. Add a compact debrief sequence for the facilitator:
   - reconstruct the evidence state;
   - compare decision pathways without ranking;
   - discuss one consequence;
   - run one counterfactual;
   - ask for transfer.
10. Do not expose hidden canonical facts before the intended reveal point.
11. Update `README.md` or the product contract with the facilitator delivery sequence and approximate timing.

### Test requirements

Add tests that would fail if:

- A participant stage has no facilitator guide.
- A guide omits its purpose, question, listen-for cues, misconception, unlock cue, or debrief connection.
- The facilitator UI labels a merely visited stage as complete.
- Begin Debrief does not explain its effect.
- The guide exposes restricted case facts before the evidence stage.

### Completion criteria

- [ ] Every participant stage has a concise facilitator cue card.
- [ ] The current cue card is visible from Live overview.
- [ ] Unlock guidance is based on a discussion or decision condition, not elapsed time alone.
- [ ] Progress labels distinguish navigation, submission, and debrief states.
- [ ] The facilitator receives a usable debrief sequence.
- [ ] No scoring or participant ranking is introduced.
- [ ] Documentation states the expected preparation, casework, and debrief timing.
- [ ] Tests pin guide completeness and information boundaries.

### Human-run test commands

```powershell
npm test -- src/branding.test.js
npm test
npm run build
```

Manual facilitator gate:

1. Create a rehearsal session.
2. Move through all eight stages.
3. Confirm the guide changes with each stage and is usable without scrolling through a long manual.
4. Begin debrief and confirm the closure warning and debrief sequence.

Pass means a facilitator unfamiliar with the implementation can run the intended novice dialogue from the console.

### Human-run commit commands

```powershell
git status --short
git diff --check
git diff -- src/FacilitatorApp.tsx src/scenario.ts src/styles.css src/branding.test.js docs/PRODUCT_CONTRACT.md README.md
git add -- src/FacilitatorApp.tsx src/scenario.ts src/styles.css src/branding.test.js docs/PRODUCT_CONTRACT.md README.md
git commit -m "Add facilitator learning guidance"
```

---

## Prompt 8 — Complete mobile access and accessibility behavior

### Objective

Ensure essential learning resources, time information, dialogs, controls, and status changes remain available to keyboard, assistive-technology, reduced-motion, and small-screen users.

### Read first

- `src/ParticipantApp.tsx`
- `src/ReferenceExperience.tsx`
- `src/FacilitatorApp.tsx`
- `src/ThemeButton.tsx`
- `src/styles.css`
- `index.html`
- `public/kuvera_debt_management_office.html`
- `src/branding.test.js`
- `docs/PRODUCT_CONTRACT.md`

### Implementation requirements

1. At widths below 800px, move Orientation, Learning Bridge, and AI Advisors into the participant menu instead of hiding them.
2. Keep the casework clock visible on small screens using a compact but labeled form.
3. Ensure the current stage, stage availability, and submission state do not rely on color alone.
4. Make every modal or full-screen workspace:
   - receive focus on open;
   - trap focus while open;
   - close with Escape where closure is allowed;
   - return focus to the invoking control;
   - prevent background interaction and scrolling.
5. Apply the same contract to the embedded Orientation, Learning Bridge, and Case File wrapper. Do not rely exclusively on focus behavior inside the iframe.
6. Ensure all interactive controls meet at least a 40px implemented target size, with a 44px target preferred for primary touch actions.
7. Avoid participant instructional text below 12px at mobile scale. Essential content must remain legible without relying on CSS `zoom` compensation.
8. Preserve reduced-motion behavior for orientation, streamed advisor responses, cursor animation, and landing transitions.
9. Ensure live status announcements are meaningful and not repetitive:
   - evidence returned;
   - save succeeded or failed;
   - facilitator update;
   - advisor response completed;
   - debrief opened.
10. Correct communications semantics:
    - pending requests are not unread messages;
    - newly returned evidence should become discoverable;
    - dismissed facilitator updates must remain dismissed until a new update arrives.
11. Add an explicit dirty/saved state:
    - `Unsaved changes` after an edit;
    - `Saving…` during persistence;
    - `Saved` after success;
    - a visible error after failure.
12. A disabled Submit control must have adjacent text explaining what is missing.
13. Do not introduce a new component framework or CSS preprocessor.

### Test requirements

Add automated source or component tests for:

- Essential learning tools remaining present in the mobile menu.
- Compact clock presence on mobile.
- Focus return for Communications, Glossary, Advisors, Orientation, Bridge, and Case File.
- Escape handling.
- Reduced-motion advisor response behavior.
- Dirty, saving, saved, and error states.
- Dismissed facilitator updates not immediately reappearing.
- Returned evidence not being represented as merely a decreasing pending count.

Do not claim WCAG conformance from unit tests alone. Complete the manual keyboard and responsive checks below.

### Completion criteria

- [ ] Orientation, Learning Bridge, AI Advisors, Case File, Communications, Glossary, theme, and Exit remain reachable on small screens.
- [ ] The casework clock remains visible and understandable.
- [ ] All dialogs implement open focus, focus containment, Escape behavior, and focus return.
- [ ] Essential mobile text is legible without browser zoom.
- [ ] Reduced-motion users receive complete content without decorative animation delay.
- [ ] Save state accurately reflects unsaved and persisted work.
- [ ] Evidence and communication indicators use accurate semantics.
- [ ] Disabled submission explains the missing requirement.
- [ ] Automated tests and manual accessibility checks pass.

### Human-run test commands

```powershell
npm test -- src/branding.test.js
npm test -- src/advisorPresentation.test.ts
npm test
npm run build
```

Manual browser gate after `npm run dev`:

1. Complete the participant flow using only the keyboard.
2. Repeat at approximately 375px, 768px, 1024px, and 1440px viewport widths.
3. Test dark and light themes.
4. Enable reduced motion and repeat Orientation, Learning Bridge, and an advisor reply.
5. Increase browser text zoom to 200% and confirm no essential control or content becomes unavailable.
6. Inspect focus return after closing every dialog.

Pass means no essential learning or timing function disappears by viewport size or input method.

### Human-run commit commands

```powershell
git status --short
git diff --check
git diff -- src/ParticipantApp.tsx src/ReferenceExperience.tsx src/FacilitatorApp.tsx src/styles.css src/branding.test.js src/advisorPresentation.test.ts docs/PRODUCT_CONTRACT.md
git add -- src/ParticipantApp.tsx src/ReferenceExperience.tsx src/FacilitatorApp.tsx src/styles.css src/branding.test.js src/advisorPresentation.test.ts docs/PRODUCT_CONTRACT.md
git commit -m "Complete responsive accessible workshop flow"
```

---

## Prompt 9 — Freeze submission context for trustworthy replay

### Objective

Make the replay and after-action review reconstruct the decision-time state rather than reinterpreting an old decision through the latest working state or current engine code.

### Read first

- `src/types.ts`
- `src/data.ts`
- `src/engine.ts`
- `src/report.ts`
- `src/ParticipantApp.tsx`
- `src/FacilitatorApp.tsx`
- `supabase/migrations/202609280001_futureslab.sql`
- `docs/PRODUCT_CONTRACT.md`
- `docs/DEPLOYMENT.md`
- `src/engine.test.ts`

### Required submission snapshot

Each new submission must persist, atomically:

- the complete decision state;
- submission version and timestamp;
- scenario version;
- consequence-rule or engine version;
- evidence IDs available at submission;
- returned/released timestamps needed to explain availability;
- relevant facilitator inject IDs available at submission;
- relevant answered institutional-message IDs available at submission.

Do not copy full source documents, binaries, advisor research corpora, or unbounded conversation bodies into the submission snapshot.

### Implementation requirements

1. Add explicit scenario and consequence-rule version constants.
2. Add a new forward migration rather than rewriting an already-applied production migration.
3. Extend the submission record with a bounded JSON snapshot or typed columns that satisfy the required snapshot contract.
4. Build the snapshot inside the same database transaction or security-definer function that creates the submission version.
5. Generate submission-specific consequences and evidence-support status from the frozen snapshot.
6. Make the participant debrief and facilitator AAR select a specific submission version.
7. Clearly label unsent current decisions as working state.
8. Preserve legacy submission readability. If legacy rows lack a frozen snapshot, label them `legacy · current-rule reconstruction` rather than silently claiming exact replay.
9. Do not retroactively manufacture frozen evidence state for legacy rows.
10. Update HTML, PDF, CSV, and JSON exports so their replay provenance is visible.
11. Update deployment documentation with migration application and verification steps.

### Test requirements

Add unit and integration-level contract tests covering:

- A submission snapshot contains all required bounded fields.
- Evidence requested but not yet available is excluded from the available-evidence set.
- Later returned evidence does not alter an earlier submission's snapshot.
- Later working edits do not alter an earlier submission's decisions or consequences.
- Two versions can produce different consequences from their respective frozen states.
- Legacy rows are labeled and remain readable.
- Report generation does not use current working decisions when a frozen submission is selected.

### Completion criteria

- [ ] Every new submission carries scenario and engine versions.
- [ ] Evidence availability is frozen atomically with the submitted decision.
- [ ] Later evidence, edits, or injects cannot change the earlier replay.
- [ ] Participant debrief and facilitator AAR identify the replayed submission version.
- [ ] Legacy submissions are explicitly labeled as reconstructions.
- [ ] Exports include replay provenance.
- [ ] A forward migration and deployment instructions are included.
- [ ] Tests prove version separation and legacy behavior.

### Human-run test commands

```powershell
npm test -- src/engine.test.ts
npm test
npm run build
```

If the Supabase CLI and a disposable local project are configured:

```powershell
supabase db reset
```

Database verification gate:

1. Submit version 1 before a delayed evidence item returns.
2. Allow the evidence to return.
3. Change the recommendation and submit version 2.
4. Confirm version 1 and version 2 retain different evidence snapshots and replay results.

Pass means historical results do not change when current decisions, evidence availability, or rule code changes.

### Human-run commit commands

Replace the migration filename below with the actual new forward-migration filename created by the implementation.

```powershell
git status --short
git diff --check
git diff -- src/types.ts src/data.ts src/engine.ts src/report.ts src/ParticipantApp.tsx src/FacilitatorApp.tsx supabase/migrations docs/PRODUCT_CONTRACT.md docs/DEPLOYMENT.md src/engine.test.ts
git add -- src/types.ts src/data.ts src/engine.ts src/report.ts src/ParticipantApp.tsx src/FacilitatorApp.tsx supabase/migrations docs/PRODUCT_CONTRACT.md docs/DEPLOYMENT.md src/engine.test.ts
git commit -m "Freeze submission context for replay"
```

---

## Prompt 10 — Consolidate scenario content and remove obsolete runtime duplication

### Objective

Reduce drift between the live React experience, embedded reference simulation, advisor context, database delay rules, tests, and documentation. Do this without introducing a general content-management or scenario-authoring framework.

### Read first

- `src/scenario.ts`
- `src/types.ts`
- `src/ParticipantApp.tsx`
- `src/ReferenceExperience.tsx`
- `src/data.ts`
- `src/engine.ts`
- `public/kuvera_debt_management_office.html`
- `docs/interface-references/kuvera_debt_management_office.html`
- `supabase/functions/advisor-chat/index.ts`
- `supabase/migrations/202609280001_futureslab.sql`
- `src/branding.test.js`
- `src/advisorResearch.test.js`
- `docs/PRODUCT_CONTRACT.md`

### Implementation requirements

1. Inventory duplicated scenario facts and rules, including:
   - stage titles and count;
   - case deadlines;
   - liquidity figures;
   - facility linkage;
   - evidence definitions and delays;
   - advisor baseline facts;
   - terminology and role boundaries.
2. Establish one canonical application-level scenario definition for content used by the React participant and facilitator interfaces.
3. Reuse that definition for stage labels, evidence cards, facilitator guides, recommendation review, and report labels.
4. Where SQL or Edge Function deployment prevents direct import, add parity tests that fail when duplicated IDs, delays, or facts diverge.
5. Stop shipping the obsolete seven-stage interactive micro-simulation as an active hidden runtime inside the eight-stage React application.
6. Preserve the immutable source reference under `docs/interface-references/`.
7. Replace the runtime dependence on the full preserved HTML file with the smallest maintainable surfaces needed for:
   - Orientation;
   - Learning Bridge;
   - Case File.
8. Extraction may happen incrementally, but do not leave two active simulation state machines.
9. Do not redesign the visual language during this task. Preserve approved tokens, geometry, and interaction tone unless another completed prompt explicitly changed them.
10. Replace brittle tests that pin entire files or exact incidental CSS strings with semantic contract tests. Continue pinning safety, information-boundary, brand, and accessibility behavior.
11. Update the product contract to identify the canonical scenario definition and the preserved reference artifact.

### Test requirements

Add regression tests that fail if:

- The frontend and SQL evidence ID sets differ.
- Frontend and SQL delay values differ.
- Advisor evidence IDs do not match the canonical catalog.
- The participant and facilitator stage counts or labels diverge.
- The runtime includes an obsolete second decision-state engine.
- The preserved design reference is modified unintentionally.
- The Case File, Orientation, or Learning Bridge becomes unavailable after extraction.

### Completion criteria

- [ ] One application-level source owns stage and evidence definitions.
- [ ] Unavoidable SQL and Edge Function duplication is protected by parity tests.
- [ ] The live application has one participant simulation state machine.
- [ ] The preserved reference remains unchanged under `docs/interface-references/`.
- [ ] Orientation, Learning Bridge, and Case File retain their intended content and visual character.
- [ ] Tests assert semantic contracts rather than incidental implementation strings wherever possible.
- [ ] Product documentation explains the new source-of-truth boundary.
- [ ] Full tests and production build pass.

### Human-run test commands

```powershell
npm test -- src/branding.test.js
npm test -- src/advisorResearch.test.js
npm test -- src/engine.test.ts
npm test
npm run build
```

Manual browser gate:

1. Complete Orientation and the Learning Bridge.
2. Review all six Case File sections.
3. Request every evidence item in a rehearsal session.
4. Use both advisors before and after evidence returns.
5. Complete and debrief the case.
6. Confirm there is no hidden or visible second process rail, clock, decision state, or replay system.

Pass means the live application expresses one coherent scenario while the original design reference remains preserved for traceability.

### Human-run commit commands

Review the implementation's actual extraction files before staging; do not stage unrelated reference changes.

```powershell
git status --short
git diff --check
git diff -- src/scenario.ts src/types.ts src/ParticipantApp.tsx src/ReferenceExperience.tsx src/data.ts src/engine.ts public supabase/functions supabase/migrations src/branding.test.js src/advisorResearch.test.js src/engine.test.ts docs/PRODUCT_CONTRACT.md
git add -- src/scenario.ts src/types.ts src/ParticipantApp.tsx src/ReferenceExperience.tsx src/data.ts src/engine.ts public supabase/functions supabase/migrations src/branding.test.js src/advisorResearch.test.js src/engine.test.ts docs/PRODUCT_CONTRACT.md
git commit -m "Consolidate Futures Lab scenario runtime"
```

---

## Final integrated completion gate

Do not describe the learning experience as complete until every applicable prompt has passed its individual gate and the following integrated walkthrough succeeds.

### Integrated participant walkthrough

1. Join as a domain newcomer.
2. Complete Orientation and the Learning Bridge before casework.
3. Confirm the 20-minute casework clock starts only with the facilitator.
4. Enter the case without seeing canonical answers.
5. Prioritize evidence and receive delayed responses.
6. Use an advisor before and after relevant evidence returns.
7. Revise the record as evidence changes.
8. Review evidence support without receiving a score or automated decision.
9. Submit a versioned negotiation-preparation brief.
10. Enter debrief without refreshing.
11. Inspect the frozen decision-time evidence, consequence, and counterfactual.
12. Record one transfer reflection.

### Integrated facilitator walkthrough

1. Create a rehearsal session.
2. Guide preparation and start casework deliberately.
3. Use the stage cue cards to facilitate the eight-stage discussion.
4. Monitor descriptive progress without interpreting it as competence.
5. Release evidence or answer one exceptional institutional request.
6. Close submissions and begin debrief.
7. Compare pathways anonymously.
8. Reconstruct one participant's frozen submission.
9. Export the authorized reports.
10. Confirm no current state has altered the historical replay.

### Final human-run verification commands

```powershell
git status --short
git diff --check
npm test
npm run build
```

If a disposable local Supabase environment is configured:

```powershell
supabase db reset
```

### Final release evidence

Record, without inventing:

- the exact commit SHA;
- the test command output;
- the production-build result;
- the migration version applied;
- the browser and viewport matrix checked;
- any remaining blocker or advisory issue.
