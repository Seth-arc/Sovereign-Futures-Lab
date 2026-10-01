# Futures Lab product contract

## Workshop identity

- Platform: **Sovereign**
- Experience: **Futures Lab**
- Workshop: **A Data-Informed Simulation for African Foresight Practice**
- Case: **Kuvera Financing Assurances**
- Participant role: **Debt Management Office**
- Timed casework: **20 minutes**, started and paused only by the facilitator
- Preparation: **Orientation plus a Learning Bridge labeled About 6 minutes**, outside the casework clock
- Capacity: **20–50 individual participants and one facilitator**
- Site icon: **AidData Brandmark** from `public/assets/AidData Brandmark.png` on every deployable page

## Participant copy contract

The landing experience leads with participant value: **Practise decisions that can withstand uncertainty.** Participants work through a high-stakes sovereign-finance case, test what the evidence supports, prepare an internal negotiation-preparation brief, and see how their choices shape the outcome.

Participant copy describes four outcomes through direct actions:

- **Decision support:** separate facts, assumptions, and unresolved risks.
- **Negotiation preparation:** build a position grounded in evidence and authority. The product does not promise negotiation performance.
- **Strategic intelligence:** connect financial, contractual, and institutional signals.
- **Reflection:** reconstruct what changed the decision and why.

The landing and About experiences present participant and institutional value before the secondary research-to-decision architecture. Participant surfaces use plain language before specialist terms or acronyms, including Debt Management Office (DMO), Official Creditor Committee (OCC), financing assurance, treatment perimeter, effective control, and Comparability of Treatment (CoT). They say `evidence available in your case record`, `this response takes time to obtain`, `exercise-only assumption`, `after-action review` or `debrief record`, and `what would have changed if you had acted differently`. They do not expose prototype instructions, internal claim identifiers ahead of human-readable provenance, or architecture jargon as task guidance.

## Scenario facts and information boundary

The deterministic engine retains the complete canonical state for consequence calculation and facilitator debrief: USD 240 million is restricted, USD 60 million is protected, verified usable liquidity is USD 480 million, and Facilities A and B share a revenue-account dependency. Canonical state is not shared participant context and must never be exposed merely because it exists in code, a decision enum, research metadata, or a debrief rule.

Participant-facing information is divided into four explicit layers:

1. **Shared case context:** Kuvera reports USD 780 million in liquidity; a partial memo indicates possible restrictions; Facility A references RA-01; Facility B's relationship to the account is unconfirmed; disclosure permission and creditor commitment status are unresolved; a USD 750 million maturity occurs in six weeks; and the IMF Board horizon is eleven weeks.
2. **Requested and returned institutional evidence:** an evidence definition may describe the question it will answer, but its detailed contents become participant-visible only after the authored response time or facilitator release. Treasury reconciliation establishes the USD 240 million restricted balance, USD 60 million protected balance, and USD 480 million usable result. Facility and dependency evidence establishes any RA-01 linkage. The legal opinion establishes the permitted disclosure boundary. Creditor clarification establishes commitment status.
3. **Facilitator replies:** an answered institutional request is participant-visible evidence for that participant. Until the reply is authorized and returned, the requested fact remains unresolved.
4. **Explanatory research:** approved research cards explain concepts, mechanisms, and reasoning patterns. They do not establish Kuvera-specific balances, account control, facility linkage, disclosure permission, or creditor commitment status.

The static Case File and choice copy may identify questions, possible claims, and available actions. They may not expose canonical values or explain which choice is correct before the corresponding evidence is visible. Honest unresolved choices remain available at every evidence-dependent decision.

## Participant journey

1. Complete the Debt Management Office Orientation.
2. Continue directly into the subject-matter Learning Bridge (About 6 minutes).
3. Return to the live room for the casework-readiness handoff at Mandate.
4. When the facilitator begins the exercise, enter the 20-minute casework and review the role-visible Kuvera Case File: country profile, indicators and DSA, creditor architecture, contracts and escrow, Common Framework process, and evidence basis.
5. Confirm mandate.
6. Diagnose the USD 780 million liquidity claim.
7. Request evidence or proceed with uncertainty.
8. Update the debt record.
9. Assess Facility A/B linkage and account control.
10. Prepare disclosure and treatment-perimeter recommendations.
11. Submit a versioned negotiation-preparation brief as an internal DMO recommendation.
12. Complete a short reflection.

On first entry, completing Orientation opens the Learning Bridge automatically; completing the bridge returns the participant to the live room at Mandate. Skip for now and Close return to an explicitly incomplete preparation state and do not mark either resource complete. Orientation, the Learning Bridge, and the complete Case File remain available throughout the exercise without resetting participant work. Preparation completion is stored separately from decision data, so reopening preparation cannot clear work and a normal refresh after casework entry restores the room without forcing preparation to restart. Participants may revisit unlocked steps. Facilitator pacing determines which new step is available. A participant may submit `READY`, `READY_WITH_CONDITIONS`, or `NOT_READY`; unresolved evidence never blocks an honest non-ready recommendation.

The participant clock reads `Casework · 20:00 · waiting` before the facilitator starts the exercise. Orientation and the Learning Bridge never start or consume that clock. Once started, it measures only the twenty-minute workshop casework. The USD 750 million maturity in six weeks and the IMF Board horizon in eleven weeks are institutional case facts, remain visible as such, and are never presented as a conversion from real-time seconds or workshop minutes.

The current Vitest stack runs in Node and has no browser DOM renderer, so the embedded reference-to-React handoff is pinned with narrow source-contract tests. The iframe receives only the fixed, bundled `/kuvera_debt_management_office.html` document; do not pass user-authored or remote HTML to `srcDoc`. It remains same-origin because the React wrapper coordinates focus, preparation completion, and the accessible Case File scroll region directly. Release verification still requires the manual browser gate: complete Orientation, complete the bridge, confirm Mandate, reopen both preparation surfaces, refresh during casework, and confirm the waiting clock remains at 20:00 before facilitator start.

The live participant room has one navigation model: the accepted eight-stage process flow on the left and the decision workspace in the center. Orientation retains the reference modal styling and motion but is rendered transparently over that live room, so it never presents a second or obsolete rail. It opens automatically for a participant whose preparation is not complete; on the same browser, a normal page refresh or later sign-in restores an already-entered case without interrupting it with preparation. Existing decision data also identifies legacy in-progress cases so the new preparation prerequisite does not displace their work. The prototype's right-hand current-step guide is intentionally absent because it duplicates the active stage heading and does not map cleanly to the facilitator-paced build. The top bar shows the enlarged Sovereign identity without repeating the participant role, followed by the casework clock, Communications, Case File, and a hamburger menu for the Glossary, light/dark mode, and Exit. Light mode uses a low-glare neutral-grey canvas with subtly separated shell, card, and input surfaces rather than a uniform off-white field. Exit saves current work before clearing the local participant session and returning to the landing page. A preparation status plus Orientation, Learning Bridge, and AI-advisor controls remain at lower left.

Communications is a separate full-screen workspace and never changes the participant's current process stage. It retains the reference channel rail, central correspondence thread, and channel-context panel while consolidating facilitator broadcasts, requested-evidence status and returned content, and exceptional institutional requests and replies. On supported laptop layouts, the workspace uses the reference interface's 150% visual scale while compensating its layout dimensions so it remains within one viewport. Routine requests are still initiated from the Evidence stage so the decision record retains the correct stage context.

AI Advisors opens as a full-page workspace without changing the participant's process stage. On supported laptop layouts it uses a viewport-compensated 150% visual scale, preventing outer-page or profile-panel scrolling. A compact selector shows one advisor brief at a time alongside the grounded text/voice conversation; longer conversation history remains the only internal overflow region. Each advisor opens with a brief in-character greeting and responds naturally to participant greetings. Amara is calm, warm, and explanatory, establishing the economic or process landscape before implications; Daniel is precise and direct, separating facts, legal boundaries, and practical implications. Completed answers are stored unchanged but reveal word by word in the visible conversation, similar to a live chat response. Reduced-motion users receive the complete answer immediately, and assistive technology receives one polite announcement after completion rather than repeated updates for every word. Each complete welcome transcript remains available in a collapsed disclosure and through its Play welcome control so the default view stays focused. Amara and Daniel use distinct, deterministic browser speech profiles; where the device exposes multiple English voices, each advisor also receives a different installed voice. The complete response remains visible in the transcript during playback, and advisor identity is always conveyed by name and profile rather than sound alone. The interface omits the redundant readiness prompt, participant-support kicker, selector instruction, and visible-evidence badge. Advisor identity is presented as name, professional biography, then advisory remit. Advisor responses remain limited to participant-visible evidence and may explain but never choose or alter a decision.

Advisor context is rebuilt for every request. Shared case context is always present. Evidence-specific Kuvera sources enter the prompt only after the corresponding request is available or facilitator-released; answered institutional requests and visible facilitator updates are included as their own evidence layers. Evidence-dependent working-decision fields are masked until the corresponding evidence is visible, so internal enum names cannot leak canonical answers. Kuvera's participant-visible facts have first authority, followed by official G20/Common Framework sources, illustrative templates, empirical research, and policy proposals. Research can explain but never overwrite participant-visible Kuvera facts or manufacture missing facts from canonical engine state. The runtime uses a deterministic topic-and-keyword index containing exactly the 21 approved research cards. It sends the configured AI provider only the selected cards' bounded claims, short verified excerpts, scope conditions, prohibited inferences, and citation metadata; source files and full reports are never loaded into the provider request. The unverified Common Framework progress DOCX is excluded from the runtime index. Policy-proposal cards are eligible only when the participant explicitly asks a policy or reform question.

The interface intentionally omits the redundant advisor readiness prompt, participant-support kicker, selector instruction, and visible-evidence badge. The Close, Hold to speak, and Ask advisor controls use the same dimensions and compact typography as the participant reference-tool buttons while retaining their distinct action states. Participant questions occupy 64% of the conversation width and advisor answers occupy 74%, with compact padding and typography that account for the workspace scale. A research-backed answer includes an expandable Sources disclosure that presents the human-readable title, source classification, and exact page reference before the claim and source IDs. The same structured citation objects remain stored in the advisor transcript for the facilitator after-action review and audit record. High-risk boundary questions receive deterministic, cited answers before any provider call: Chinese-loan collateralization retains dataset boundaries; an MoU is not cash-effective relief; World Bank statutory options remain proposals; and Comparability of Treatment is not one haircut formula. Any question that relies on the blocked progress DOCX fails closed as a source gap without a citation or model-generated answer.

## Recommendation evidence-support review

Immediately before submission, the participant sees a compact **Recommendation check** for liquidity basis, account classification, Facility A/B linkage, disclosure recommendation, treatment perimeter, and readiness position. The deterministic review compares each recorded claim with evidence available at that moment. A request alone is not evidence: its authored response time must have elapsed or the facilitator must have released it. The same review result and plain-language explanation are retained for each submitted version and used in the facilitator after-action report's evidence-incorporation section.

The four support statuses mean:

- `SUPPORTED` — the evidence available at the review moment establishes and agrees with the recorded claim.
- `CONDITIONAL` — some relevant evidence is available or the shared case context supports a bounded direction, but the review names an evidence dependency that remains open.
- `UNRESOLVED` — the participant has preserved uncertainty, deferred the conclusion, or has not recorded a conclusion; this is not labeled incorrect.
- `UNSUPPORTED` — the recorded claim goes beyond or conflicts with the evidence available at the review moment.

The authored comparison rules remain claim-specific. USD 480 million requires the returned Treasury reconciliation; USD 780 million is supported only as a provisional reported basis before that reconciliation returns. Effective-control classification requires the returned account-control terms; a Facility A waterfall alone is conditional. Shared-pool linkage and a two-facility perimeter require returned Facility B or dependency evidence; Facility A evidence alone makes those claims conditional, and no facility evidence makes a firm shared-pool claim unsupported. A redacted disclosure is conditional until the legal confidentiality opinion returns, while full disclosure remains unsupported without consent. Deferring the perimeter or recording unresolved linkage remains `UNRESOLVED`.

Readiness is reviewed against the five underlying material claims. `NOT_READY` remains a valid, submittable posture when evidence is unresolved. `READY_WITH_CONDITIONS` may preserve conditional or unresolved dependencies, but it does not convert an unsupported firm claim into support. `READY` is supported only when all five claims are supported; otherwise the interface shows an explicit readiness mismatch. The product deliberately permits submission of that mismatch so it can be examined in debrief rather than silently changing or blocking the participant's conclusion. Every posture requires a Finance Ministry recommendation and next institutional handoff; conditions remain available for honest uncertainty. Support status never becomes a score, percentage, pass/fail mark, ranking, or competence judgment.

## Negotiation-preparation brief

The submission surface produces one compact **Negotiation-preparation brief** for internal DMO handoff. It is not a negotiation result, agreement, assurance, or sovereign commitment. The brief contains the participant's position; the evidence actually available at submission; known uncertainties from the deterministic recommendation review; the selected disclosure boundary and treatment perimeter; conditions to advance; the next institutional handoff; and the recommendation to the Finance Ministry Lead.

The brief reuses the structured decision record. `unresolvedRisks` is presented as **Conditions to advance**, and `finalRationale` is presented as **Recommendation to the Finance Ministry Lead**. The only new participant-authored field is `nextHandoff`, presented as **Next institutional handoff**. A brief is submittable when position, next handoff, and Finance Ministry recommendation are recorded; `NOT_READY` and `READY_WITH_CONDITIONS` remain valid positions. Participants may revise every field and submit additional versions until the facilitator closes submissions.

Evidence basis is generated only from requested evidence whose authored availability time has elapsed by the submission moment or which the facilitator released by that moment, plus institutional replies that were answered by that moment. Requested-but-pending evidence and later replies are excluded. Each submission snapshot retains the complete decision state, including `nextHandoff`; the deterministic brief is reconstructed at that version's submission time. Individual AARs, workshop HTML/PDF comparisons, CSV/JSON exports, and the local emergency handoff expose the named brief sections without requiring a facilitator to interpret raw decision JSON.

## Deterministic boundary

The scenario engine owns outcomes and counterfactuals. AI advisors may explain role-visible facts and engine results, but may not select an answer, change state, release evidence, or generate canonical consequences.

## Facilitator boundary

The facilitator can create rehearsal/live sessions, start or pause the clock, unlock stages, broadcast injects, release delayed evidence early, answer exceptional participant requests while role-playing an institution, inspect participant progress, remove an invalid or duplicate registration, close submissions, initiate debrief, anonymize the projected comparison, and export authorized reports.

The facilitator cannot silently edit a participant submission or replace deterministic consequences with an improvised outcome.

## Data and privacy

- Collected: name, organization, email, decisions, rationales, the next institutional handoff, evidence requests, timestamps, facilitator interventions, messages, advisor transcripts, and reflection. The next handoff is retained inside the decision record and each versioned submission snapshot. Downloadable reports are regenerated from these records; exported files are not uploaded back to the platform.
- Purpose: workshop delivery and debrief only; no research use.
- Audio: processed for transcription and not persisted.
- Retention: automatic deletion 30 days after the session; facilitator may delete earlier.
- Detailed AARs and identified exports: facilitator only.
- Participant completion view: short reflection and acknowledgement only.

## Explicit non-goals

- No multi-role participant simulation.
- No participant-to-participant collaboration.
- No general-purpose scenario authoring system.
- No probabilistic scoring, ranking, or inferred competence.
- No recreation of the full production architecture.
- No continuous-listening voice agent.
