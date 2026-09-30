# Futureslab product contract

## Workshop identity

- Workshop: **A Data-Informed Simulation for African Foresight Practice**
- Platform: **Sovereign Room**
- Exercise: **Kuvera Financing Assurances**
- Human role: **Debt Management Office**
- Timed casework: **20 minutes**, started and paused only by the facilitator
- Preparation: **Orientation plus a Learning Bridge labeled About 6 minutes**, outside the casework clock
- Capacity: **20–50 individual participants and one facilitator**
- Site icon: **AidData Brandmark** from `public/assets/AidData Brandmark.png` on every deployable page

## Scenario facts

- Kuvera reports USD 780 million in liquidity.
- USD 240 million is restricted and USD 60 million is protected.
- Verified usable liquidity is USD 480 million.
- A USD 750 million maturity occurs in six weeks.
- The IMF Board horizon is eleven weeks.
- Facilities A and B share a revenue-account dependency in canonical scenario state.

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
11. Submit a versioned DMO recommendation.
12. Complete a short reflection.

On first entry, completing Orientation opens the Learning Bridge automatically; completing the bridge returns the participant to the live room at Mandate. Skip for now and Close return to an explicitly incomplete preparation state and do not mark either resource complete. Orientation, the Learning Bridge, and the complete Case File remain available throughout the exercise without resetting participant work. Preparation completion is stored separately from decision data, so reopening preparation cannot clear work and a normal refresh after casework entry restores the room without forcing preparation to restart. Participants may revisit unlocked steps. Facilitator pacing determines which new step is available. A participant may submit `READY`, `READY_WITH_CONDITIONS`, or `NOT_READY`; unresolved evidence never blocks an honest non-ready recommendation.

The participant clock reads `Casework · 20:00 · waiting` before the facilitator starts the exercise. Orientation and the Learning Bridge never start or consume that clock. Once started, it measures only the twenty-minute workshop casework. The USD 750 million maturity in six weeks and the IMF Board horizon in eleven weeks are institutional case facts, remain visible as such, and are never presented as a conversion from real-time seconds or workshop minutes.

The current Vitest stack runs in Node and has no browser DOM renderer, so the embedded reference-to-React handoff is pinned with narrow source-contract tests. Release verification still requires the manual browser gate: complete Orientation, complete the bridge, confirm Mandate, reopen both preparation surfaces, refresh during casework, and confirm the waiting clock remains at 20:00 before facilitator start.

The live participant room has one navigation model: the accepted eight-stage process flow on the left and the decision workspace in the center. Orientation retains the reference modal styling and motion but is rendered transparently over that live room, so it never presents a second or obsolete rail. It opens automatically for a participant whose preparation is not complete; on the same browser, a normal page refresh or later sign-in restores an already-entered case without interrupting it with preparation. Existing decision data also identifies legacy in-progress cases so the new preparation prerequisite does not displace their work. The prototype's right-hand current-step guide is intentionally absent because it duplicates the active stage heading and does not map cleanly to the facilitator-paced build. The top bar shows the enlarged Sovereign identity without repeating the participant role, followed by the casework clock, Communications, Case File, and a hamburger menu for the Glossary, light/dark mode, and Exit. Light mode uses a low-glare neutral-grey canvas with subtly separated shell, card, and input surfaces rather than a uniform off-white field. Exit saves current work before clearing the local participant session and returning to the landing page. A preparation status plus Orientation, Learning Bridge, and AI-advisor controls remain at lower left.

Communications is a separate full-screen workspace and never changes the participant's current process stage. It retains the reference channel rail, central correspondence thread, and channel-context panel while consolidating facilitator broadcasts, requested-evidence status and returned content, and exceptional institutional requests and replies. On supported laptop layouts, the workspace uses the reference interface's 150% visual scale while compensating its layout dimensions so it remains within one viewport. Routine requests are still initiated from the Evidence stage so the decision record retains the correct stage context.

AI Advisors opens as a full-page workspace without changing the participant's process stage. On supported laptop layouts it uses a viewport-compensated 150% visual scale, preventing outer-page or profile-panel scrolling. A compact selector shows one advisor brief at a time alongside the grounded text/voice conversation; longer conversation history remains the only internal overflow region. Each advisor opens with a brief in-character greeting and responds naturally to participant greetings. Amara is calm, warm, and explanatory, establishing the economic or process landscape before implications; Daniel is precise and direct, separating facts, legal boundaries, and practical implications. Completed answers are stored unchanged but reveal word by word in the visible conversation, similar to a live chat response. Reduced-motion users receive the complete answer immediately, and assistive technology receives one polite announcement after completion rather than repeated updates for every word. Each complete welcome transcript remains available in a collapsed disclosure and through its Play welcome control so the default view stays focused. Amara and Daniel use distinct, deterministic browser speech profiles; where the device exposes multiple English voices, each advisor also receives a different installed voice. The complete response remains visible in the transcript during playback, and advisor identity is always conveyed by name and profile rather than sound alone. The interface omits the redundant readiness prompt, participant-support kicker, selector instruction, and visible-evidence badge. Advisor identity is presented as name, professional biography, then advisory remit. Advisor responses remain limited to participant-visible evidence and may explain but never choose or alter a decision.

Advisor context is rebuilt for every request. Kuvera's participant-visible facts and deterministic state have first authority, followed by official G20/Common Framework sources, illustrative templates, empirical research, and policy proposals. Research can explain but never overwrite canonical Kuvera facts. The runtime uses a deterministic topic-and-keyword index containing exactly the 21 approved research cards. It sends the configured AI provider only the selected cards' bounded claims, short verified excerpts, scope conditions, prohibited inferences, and citation metadata; source files and full reports are never loaded into the provider request. The unverified Common Framework progress DOCX is excluded from the runtime index. Policy-proposal cards are eligible only when the participant explicitly asks a policy or reform question.

The interface intentionally omits the redundant advisor readiness prompt, participant-support kicker, selector instruction, and visible-evidence badge. The Close, Hold to speak, and Ask advisor controls use the same dimensions and compact typography as the participant reference-tool buttons while retaining their distinct action states. Participant questions occupy 64% of the conversation width and advisor answers occupy 74%, with compact padding and typography that account for the workspace scale. A research-backed answer includes an expandable Sources disclosure containing the claim ID, source ID, title, exact page reference, and source classification. The same structured citation objects remain stored in the advisor transcript for the facilitator AAR and audit record. High-risk boundary questions receive deterministic, cited answers before any provider call: Chinese-loan collateralization retains dataset boundaries; an MoU is not cash-effective relief; World Bank statutory options remain proposals; and Comparability of Treatment is not one haircut formula. Any question that relies on the blocked progress DOCX fails closed as a source gap without a citation or model-generated answer.

## Deterministic boundary

The scenario engine owns outcomes and counterfactuals. AI advisors may explain role-visible facts and engine results, but may not select an answer, change state, release evidence, or generate canonical consequences.

## Facilitator boundary

The facilitator can create rehearsal/live sessions, start or pause the clock, unlock stages, broadcast injects, release delayed evidence early, answer exceptional participant requests while role-playing an institution, inspect participant progress, remove an invalid or duplicate registration, close submissions, initiate debrief, anonymize the projected comparison, and export authorized reports.

The facilitator cannot silently edit a participant submission or replace deterministic consequences with an improvised outcome.

## Data and privacy

- Collected: name, organization, email, decisions, rationales, evidence requests, timestamps, facilitator interventions, messages, advisor transcripts, and reflection. Downloadable reports are regenerated from these records; exported files are not uploaded back to the platform.
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
- No recreation of the full Sovereign Room production architecture.
- No continuous-listening voice agent.
