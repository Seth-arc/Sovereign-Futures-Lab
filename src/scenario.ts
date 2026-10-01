import type {
  AdvisorId,
  CaseFileSection,
  EvidenceDefinition,
  LearningBridgeChapter,
  MaterialRecommendationClaim,
  OrientationStepDefinition,
} from "./types";

export const WORKSHOP_TITLE = "A Data-Informed Simulation for African Foresight Practice";
export const EXERCISE_TITLE = "Kuvera Financing Assurances";
export const ROLE_TITLE = "Debt Management Office";
export const FACILITATOR_EMAIL = "snguna@aiddata.wm.edu";

export const CASE_FACTS = {
  caseworkDurationSeconds: 20 * 60,
  maturityUsdMillions: 750,
  maturityWeeks: 6,
  imfBoardHorizonWeeks: 11,
  reportedLiquidityUsdMillions: 780,
  restrictedLiquidityUsdMillions: 240,
  protectedLiquidityUsdMillions: 60,
  usableLiquidityUsdMillions: 480,
  facilityAAccount: "RA-01",
  facilityBEntryStatus: "unconfirmed",
  facilityLinkageFinding: "SHARED_POOL",
} as const;

export const ROLE_BOUNDARY = {
  lead: "You hold the loan agreements and the claims record. You do not hold the cash position, the legal reading, or the authority to release anything externally. Use your role to inspect, request, compare, record, and recommend without crossing those boundaries.",
  mandate: "Maintain and reconcile the claims record, map Facility A/B dependencies, and prepare debt-treatment inputs for the Finance Ministry team.",
  evidenceAvailable: "Facility agreements, the debt-service calendar, claim terms, the partial copper-revenue account memo, and internal creditor-position notes.",
  authorityBoundary: "May request verification, reconcile claims, map dependencies, propose treatment inputs, and revise DMO records. Cannot authorize disclosure or create a creditor financing assurance.",
  criticalHandoff: "Needs Treasury for cash availability and protected balances; Legal for interpretation; and the Finance Ministry Lead for external submission and disclosure decisions.",
  may: [
    "Maintain and reconcile the claims record.",
    "Request role-relevant evidence.",
    "Assess dependencies and prepare recommendations.",
    "Preserve uncertainty and document non-readiness.",
  ],
  mayNot: [
    "Issue a sovereign commitment.",
    "Declare a creditor assurance adequate.",
    "Reveal evidence not released to your role.",
    "Convert an indicative position into an agreement.",
  ],
} as const;

export const STAGES = [
  {
    title: "Confirm mandate",
    short: "Mandate",
    objective: "Separate the DMO's record, analysis, and recommendation authority from sovereign commitment authority.",
  },
  {
    title: "Diagnose liquidity",
    short: "Liquidity",
    objective: `Decide whether the reported USD ${CASE_FACTS.reportedLiquidityUsdMillions}m can support the current package or needs verification.`,
  },
  {
    title: "Request evidence",
    short: "Evidence",
    objective: "Use institutional requests to close material uncertainty while managing two deadlines.",
  },
  {
    title: "Update the debt record",
    short: "Record",
    objective: "Record the liquidity basis actually supported at the decision moment.",
  },
  {
    title: "Assess account and facility linkage",
    short: "Linkage",
    objective: "Assess whether account rules create effective control—practical limits on Kuvera’s use of cash—and whether Facilities A and B share a treatment dependency.",
  },
  {
    title: "Prepare disclosure recommendation",
    short: "Disclosure",
    objective: "Recommend what can be disclosed and which claims belong in the treatment perimeter—the facilities carried into restructuring analysis—without exceeding Debt Management Office authority.",
  },
  {
    title: "Prepare negotiation brief",
    short: "Submit",
    objective: "Submit an internal negotiation-preparation brief that states what is known, unknown, and conditional, with unresolved risks preserved.",
  },
  {
    title: "Debrief and transfer",
    short: "Debrief",
    objective: "Reconstruct your submitted decision, then record how you will transfer the learning to a real decision under uncertainty.",
  },
] as const;

export const FINAL_STAGE_INDEX = STAGES.length - 1;

export interface FacilitatorStageGuide {
  learningPurpose: string;
  openingQuestion: string;
  listenFor: readonly [string, string, string?];
  misconception: string;
  unlockCondition: string;
  debriefConnection: string;
}

export const FACILITATOR_STAGE_GUIDES = [
  {
    learningPurpose: "Separate DMO analysis and recommendation authority from sovereign commitment authority.",
    openingQuestion: "What can the DMO decide now, and what must it hand off?",
    listenFor: [
      "A distinction between maintaining the record, advising the Finance Ministry, and making a sovereign commitment.",
      "Named dependencies on Treasury, Legal, or the Finance Ministry Lead.",
    ],
    misconception: "Preparing a recommendation is the same as authorizing a sovereign commitment.",
    unlockCondition: "Unlock Liquidity when participants can state the DMO authority boundary in their own words.",
    debriefConnection: "Return to whether the submitted brief stayed within the authority boundary.",
  },
  {
    learningPurpose: "Distinguish a reported balance from liquidity that can support the package.",
    openingQuestion: "What would need to be true before a reported balance could support the package?",
    listenFor: [
      "Questions about restrictions, protections, control, and practical access.",
      "A deliberate choice between verification and proceeding with a named caveat.",
      "Recognition that a caveat preserves uncertainty rather than resolving it.",
    ],
    misconception: "A reported balance is automatically usable cash.",
    unlockCondition: "Unlock Evidence when participants name a material verification question and record their first move.",
    debriefConnection: "Compare how the first move shaped the evidence available at submission.",
  },
  {
    learningPurpose: "Prioritize evidence requests against the decision dependencies that matter most.",
    openingQuestion: "Which uncertainty could most change your recommendation, and who can resolve it?",
    listenFor: [
      "Requests tied to a specific decision rather than general information gathering.",
      "Awareness that requested evidence is not yet available evidence.",
      "A reason for requesting now or proceeding with uncertainty.",
    ],
    misconception: "Requesting every document creates a stronger evidence basis immediately.",
    unlockCondition: "Unlock Record when participants have requested or deliberately deferred evidence and can explain the priority.",
    debriefConnection: "Reconstruct which requests had actually returned when the brief was submitted.",
  },
  {
    learningPurpose: "Update the debt record only to the conclusion supported at the decision moment.",
    openingQuestion: "What does the evidence available now establish, and what does it leave open?",
    listenFor: [
      "Use of returned evidence rather than request status alone.",
      "A clear distinction between provisional, verified, and unresolved conclusions.",
      "A rationale that names any remaining caveat.",
    ],
    misconception: "Selecting a precise figure makes it verified.",
    unlockCondition: "Unlock Linkage when participants record a liquidity basis and explain its evidence boundary.",
    debriefConnection: "Test whether the submitted liquidity basis matched the evidence then available.",
  },
  {
    learningPurpose: "Assess account control and cross-facility dependency as related but distinct claims.",
    openingQuestion: "What evidence would let you classify the account and the relationship between the facilities separately?",
    listenFor: [
      "Separate reasoning about account control and facility linkage.",
      "Attention to operational dependency as well as formal legal labels.",
      "An unresolved selection when the record does not establish a conclusion.",
    ],
    misconception: "A formal label alone establishes whether the facilities are operationally linked.",
    unlockCondition: "Unlock Disclosure when participants record both claims or preserve uncertainty and name the missing dependency.",
    debriefConnection: "Compare the linkage claim with the treatment perimeter in the submitted brief.",
  },
  {
    learningPurpose: "Set a disclosure boundary and treatment perimeter without exceeding the available authority or evidence.",
    openingQuestion: "What can the DMO responsibly share, and which facilities should remain in scope?",
    listenFor: [
      "A disclosure level tied to permission actually available.",
      "A treatment perimeter tied to recorded facility dependencies.",
      "Explicit conditions where Legal or another institution must act next.",
    ],
    misconception: "Transparency requires sharing every underlying document in full.",
    unlockCondition: "Unlock Submit when participants record both recommendations and explain any condition or deferral.",
    debriefConnection: "Examine whether disclosure and perimeter choices were coherent with the evidence state.",
  },
  {
    learningPurpose: "Assemble a coherent internal preparation brief that separates the selected position from its support.",
    openingQuestion: "What should the Finance Ministry Lead know, question, and hand off before advancing?",
    listenFor: [
      "A readiness position consistent with named conditions and uncertainties.",
      "A specific next institutional handoff.",
      "Use of the Recommendation check as decision support, not a score.",
    ],
    misconception: "A confident position removes the need to state unresolved evidence or conditions.",
    unlockCondition: "Open the debrief waiting state when a versioned brief has been submitted; do not require a ready posture.",
    debriefConnection: "Use the preserved version to reconstruct what the participant knew and recommended.",
  },
  {
    learningPurpose: "Reconstruct the submitted decision and transfer one lesson to future work under uncertainty.",
    openingQuestion: "Looking at the submitted record, where did evidence most change or constrain the decision?",
    listenFor: [
      "Reconstruction from the submitted version rather than hindsight.",
      "Comparison of pathways without ranking participants.",
      "A concrete change the participant would make in real preparation.",
    ],
    misconception: "The deterministic consequence is a real-world prediction or a competence finding.",
    unlockCondition: "Close the session after participants inspect their debrief and record a transfer reflection.",
    debriefConnection: "End by asking what the participant will do differently in a real decision under uncertainty.",
  },
] as const satisfies readonly FacilitatorStageGuide[];

export const EVIDENCE_CATALOG: EvidenceDefinition[] = [
  {
    id: "treasury-reconciliation",
    title: "Treasury cash reconciliation",
    requestedFrom: "Treasury and Cash Management",
    delaySeconds: 35,
    summary: "Reconciles reported, restricted, protected, and usable balances.",
    sourceLabel: "Kuvera Treasury reconciliation · case record",
    details: `Reported liquidity is USD ${CASE_FACTS.reportedLiquidityUsdMillions}m. USD ${CASE_FACTS.restrictedLiquidityUsdMillions}m is restricted and USD ${CASE_FACTS.protectedLiquidityUsdMillions}m is protected. The resulting usable-liquidity basis is USD ${CASE_FACTS.usableLiquidityUsdMillions}m.`,
    advisorContext: `Reported liquidity is USD ${CASE_FACTS.reportedLiquidityUsdMillions}m. USD ${CASE_FACTS.restrictedLiquidityUsdMillions}m is restricted and USD ${CASE_FACTS.protectedLiquidityUsdMillions}m is protected, producing USD ${CASE_FACTS.usableLiquidityUsdMillions}m usable liquidity.`,
  },
  {
    id: "account-control",
    title: "Restricted-account control terms",
    requestedFrom: "Treasury and Legal",
    delaySeconds: 45,
    summary: "Identifies withdrawal, replenishment, and creditor-control conditions.",
    sourceLabel: "Revenue Account RA-01 control summary · case record",
    details: `Copper-export receipts enter ${CASE_FACTS.facilityAAccount}. Withdrawals below the protected balance require policy-bank consent, and scheduled debt service is swept before residual funds become available to Kuvera.`,
    advisorContext: `Copper-export receipts enter ${CASE_FACTS.facilityAAccount}. Scheduled debt service is swept before residual funds become available, and withdrawals below the protected balance require consent.`,
  },
  {
    id: "facility-a",
    title: "Facility A agreement extract",
    requestedFrom: "Legal Counsel",
    delaySeconds: 30,
    summary: "Provides the account covenant and payment-waterfall terms for Facility A.",
    sourceLabel: "Facility A agreement extract · case record",
    details: `Facility A requires specified export proceeds to flow through ${CASE_FACTS.facilityAAccount} and applies the account waterfall to scheduled Facility A debt service.`,
    advisorContext: `Facility A requires specified export proceeds to flow through ${CASE_FACTS.facilityAAccount} and applies the account waterfall to scheduled Facility A debt service.`,
  },
  {
    id: "facility-b",
    title: "Facility B agreement extract",
    requestedFrom: "Legal Counsel",
    delaySeconds: 55,
    summary: "Tests whether Facility B cross-references the revenue-account arrangement.",
    sourceLabel: "Facility B agreement extract · case record",
    details: `Facility B incorporates the common revenue-account schedule by reference. Its payment support therefore depends on the same ${CASE_FACTS.facilityAAccount} pool used by Facility A.`,
    advisorContext: `Facility B incorporates the common revenue-account schedule by reference. Its payment support therefore depends on the same ${CASE_FACTS.facilityAAccount} pool used by Facility A.`,
  },
  {
    id: "cross-collateralization",
    title: "Cross-collateralization review",
    requestedFrom: "Debt and Legal Review",
    delaySeconds: 65,
    summary: "Tests whether the two facilities may be assessed independently.",
    sourceLabel: "Kuvera facility dependency review · case record",
    details: "The facilities are not formally secured by identical assets, but they share the same controlled revenue pool. Treating Facility B as operationally independent would omit a material dependency.",
    advisorContext: `Facilities A and B are not formally secured by identical assets, but they share the same controlled ${CASE_FACTS.facilityAAccount} revenue pool. This creates an operational dependency.`,
  },
  {
    id: "confidentiality-opinion",
    title: "Legal confidentiality opinion",
    requestedFrom: "Legal Counsel",
    delaySeconds: 50,
    summary: "Defines what may be disclosed without reproducing restricted contract text.",
    sourceLabel: "Kuvera Legal disclosure opinion · case record",
    details: "Kuvera may provide a redacted functional summary of account control, affected balances, and cross-facility dependency. Full contract text requires consent under the scenario confidentiality clause.",
    advisorContext: "Kuvera may provide a redacted functional summary of control, affected balances, and cross-facility dependency. Full contract text requires consent.",
  },
  {
    id: "creditor-status",
    title: "Creditor commitment-status clarification",
    requestedFrom: "Policy-bank creditor delegation",
    delaySeconds: 70,
    summary: "Separates an indicative position from an authorized commitment.",
    sourceLabel: "Creditor commitment-status clarification · case record",
    details: "The creditor has provided an indicative willingness to engage. Headquarters authorization remains outstanding; the statement is not a financing assurance or agreement in principle.",
    advisorContext: "The creditor has provided an indicative willingness to engage. Headquarters authorization remains outstanding; the statement is not a financing assurance or agreement in principle.",
  },
  {
    id: "occ-request",
    title: "OCC information request",
    requestedFrom: "OCC Secretariat",
    delaySeconds: 25,
    summary: "Clarifies the minimum information needed for the treatment-perimeter discussion.",
    sourceLabel: "Official Creditor Committee Secretariat request · case record",
    details: "The OCC requests the usable-liquidity basis, a functional account-control summary, affected facilities, and explicit identification of unresolved commitment status.",
    advisorContext: "The OCC requests the usable-liquidity basis, a functional account-control summary, affected facilities, and explicit identification of unresolved commitment status.",
  },
  {
    id: "imf-clarification",
    title: "IMF financing-assurances clarification",
    requestedFrom: "IMF Technical Staff",
    delaySeconds: 40,
    summary: "Clarifies the distinction between package readiness and later implementation.",
    sourceLabel: "IMF financing-assurances clarification · case record",
    details: "The Board horizon requires credible financing assurances, but an assurance remains distinct from agreement in principle, an MoU, bilateral implementation, and cash-effective relief.",
    advisorContext: "The Board horizon requires credible financing assurances, but an assurance remains distinct from agreement in principle, an MoU, bilateral implementation, and cash-effective relief.",
  },
];

export const ORIENTATION_STEPS: readonly OrientationStepDefinition[] = [
  {
    id: "role",
    title: "What you are here to do",
    body: [
      "You are the Debt Management Office (DMO) inside Kuvera's Finance Ministry. You maintain the claims record, request evidence, map dependencies, and prepare a recommendation. Treasury, Legal, creditors, the Official Creditor Committee (OCC), and IMF staff are represented by the exercise or facilitator.",
      "The live room uses the eight-stage process behind this orientation. The facilitator unlocks each new stage; every earlier unlocked stage remains available for revision.",
    ],
    location: "Role · Debt Management Office",
  },
  {
    id: "clock",
    title: "Casework starts with the facilitator",
    body: [
      "Orientation and the Learning Bridge do not use casework time. The casework counter remains at 20:00 and waiting until the facilitator begins the exercise.",
      `Inside the case, two separate institutional deadlines still matter: a USD ${CASE_FACTS.maturityUsdMillions}m maturity in ${CASE_FACTS.maturityWeeks} weeks and the IMF Board horizon in ${CASE_FACTS.imfBoardHorizonWeeks} weeks. Workshop minutes do not convert into scenario days or weeks.`,
    ],
    location: "Look top right · Casework clock",
  },
  {
    id: "grounding",
    title: "Concept grounding",
    body: [
      "Before the live case, the Learning Bridge introduces the operating distinctions this exercise uses: gross versus usable liquidity, formal security versus effective control, and the sequence from proposal through assurance to cash-effective relief.",
      "Every bridge example is invented for practice. Kuvera's possible account restrictions, facility linkage, disclosure permission, and commitment status remain for you to establish from returned evidence.",
    ],
    location: "Look bottom left · Learning Bridge",
  },
  {
    id: "process",
    title: "Facilitator-paced, revisitable steps",
    body: [
      "The Process flow on the left is the workshop's single navigation model. The facilitator unlocks each new stage through Socratic dialogue.",
      "You may return to any unlocked stage. Locked stages remain visibly marked Await facilitator, so the rail always reflects the live workshop state.",
    ],
    location: "Look left · Process flow",
  },
  {
    id: "record",
    title: "Every decision carries a reason",
    body: [
      "Each decision stage combines a structured choice with a short written rationale. Save your work before moving on.",
      "The facilitator's after-action report reconstructs what you chose, what evidence was available, what you requested, and what remained unresolved at that moment.",
    ],
    location: "Look centre · Decision workspace",
  },
  {
    id: "case-file",
    title: "Use the complete Case File",
    body: [
      "The Case File in the top right holds the country profile, indicators, contracts, creditor landscape, Common Framework process, and evidence basis.",
      "It remains available throughout the exercise without resetting or replacing your live workshop work.",
    ],
    location: "Look top right · Case File",
  },
  {
    id: "requests",
    title: "Requests create a record",
    body: [
      "Use Communications to review routine evidence after the facilitator releases the Evidence stage. Unusual requests go to the facilitator acting in the named institutional role.",
      "Every request and response is timestamped for the after-action review. Requested evidence is not available evidence until it returns or the facilitator releases it.",
    ],
    location: "Look top right · Communications",
  },
  {
    id: "advisors",
    title: "Two advisors, on call",
    body: [
      "Amara Okoye covers the country, creditor architecture, and Common Framework sequence. Daniel Mensah covers contracts, restricted accounts, effective control, disclosure, and Comparability of Treatment.",
      "Their answers are grounded in evidence available in your case record. They cannot choose your recommendation or reveal hidden state.",
    ],
    location: "Look bottom left · AI advisors",
  },
  {
    id: "debrief",
    title: "The debrief is the point",
    body: [
      "After submissions close, the final participant stage reconstructs your submitted position, the evidence available at submission, bounded exercise consequences, unresolved risks, and one fixed-assumption counterfactual.",
      "You then record what you will do differently when preparing a real decision under uncertainty. Nothing is scored or ranked.",
    ],
    location: `Step ${STAGES.length} · Debrief and transfer`,
  },
];

export const LEARNING_BRIDGE_CHAPTERS: readonly LearningBridgeChapter[] = [
  {
    id: "process",
    tab: "Process",
    title: "Where financing assurances sit in the Common Framework",
    type: "Process frame",
    objective: "Name which process state a creditor communication has reached, and what remains before debt service changes.",
    introduction: "A financing assurance can support IMF Board consideration before final legal terms exist. It must remain distinct from agreement and implementation.",
    model: [
      { label: "Request and programme frame", detail: "The debtor requests treatment; sustainability and programme parameters frame the relief required." },
      { label: "Creditor coordination", detail: "Official creditors organize, exchange information, and establish the decision architecture." },
      { label: "Financing assurances", detail: "Creditor signals can support Board consideration before final instruments exist." },
      { label: "Treatment parameters", detail: "Creditors quantify terms and test consistency with the programme frame." },
      { label: "MoU and bilaterals", detail: "Common parameters become creditor-specific instruments and approvals." },
      { label: "Cash-effective relief", detail: "Debt-service effects arrive only after authorization, documentation, and exchange." },
    ],
    practice: {
      scenario: "A creditor confirms it will participate in treatment consistent with the programme, while specific terms remain to be agreed.",
      question: "Which state has that communication reached?",
      options: [
        { label: "Agreement in principle", correct: false, feedback: "Agreement in principle requires agreed terms; this communication leaves them open." },
        { label: "A financing assurance", correct: true, feedback: "This is a participation signal that may support Board consideration while quantified terms remain open." },
        { label: "Cash-effective relief", correct: false, feedback: "Relief follows authorization, documentation, exchange, and operational implementation." },
      ],
    },
    takeaway: "Proposal, assurance, agreement, MoU, implementation, and cash-effective relief are separate states.",
  },
  {
    id: "liquidity",
    tab: "Liquidity",
    title: "Read liquidity through control and availability",
    type: "Liquidity frame",
    objective: "Separate visibility, verification, and availability in a cash position.",
    introduction: "A sovereign cash figure is not decision-ready until the team knows which balances are available for the intended use inside the decision window.",
    model: [
      { label: "Visible", detail: "The balance appears in the record." },
      { label: "Verified", detail: "The amount and its restrictions have been reconciled." },
      { label: "Freely usable", detail: "The sovereign can use the balance for the intended purpose." },
    ],
    practice: {
      scenario: "A practice ministry reports USD 1.2bn. USD 150m is verified as ring-fenced, and USD 300m may require lender consent but has not been confirmed.",
      question: "Which figure is the defensible planning basis?",
      options: [
        { label: "USD 1.2bn because all cash is visible", correct: false, feedback: "Visibility does not establish availability, and the protected balance is already known to be unavailable." },
        { label: "USD 750m after treating the possible restriction as proven", correct: false, feedback: "That converts an unverified memo into an established restriction." },
        { label: "USD 1.05bn confirmed, with USD 300m explicitly unresolved", correct: true, feedback: "This preserves the actual evidence status and makes verification the next action." },
      ],
    },
    takeaway: "Gross liquidity can exceed usable liquidity, and an unverified restriction is neither proven nor safely ignored.",
  },
  {
    id: "treatment",
    tab: "Treatment",
    title: "Comparability of Treatment is multi-dimensional",
    type: "Treatment frame",
    objective: "Compare treatment across three indicators without collapsing creditor effort into one number.",
    introduction: "Different instruments can deliver effort through different mixes of present value, maturity extension, and debt-service relief.",
    model: [
      { label: "Nominal debt service", detail: "Change in nominal debt service over the relevant programme period." },
      { label: "Debt-stock NPV", detail: "Change in treated debt measured in net-present-value terms." },
      { label: "Duration", detail: "Change in the maturity or duration of treated claims." },
    ],
    practice: {
      scenario: "Creditor X offers a large NPV reduction with no maturity extension. Creditor Y offers a long extension with a smaller NPV reduction. Both produce similar programme-period debt service.",
      question: "What is the strongest comparison?",
      options: [
        { label: "X contributes more because NPV is decisive", correct: false, feedback: "Selecting one indicator as decisive collapses the multi-dimensional comparison." },
        { label: "The treatments are equivalent", correct: false, feedback: "The profiles genuinely differ; declaring equivalence hides the trade-off." },
        { label: "Set out all three indicators before judging effort", correct: true, feedback: "A defensible comparison names where each treatment is stronger and why the trade-off matters." },
      ],
    },
    takeaway: "Compare nominal debt service, NPV change, and duration together, and state the trade-off.",
  },
  {
    id: "contracts",
    tab: "Contracts",
    title: "Separate security, control, dependency, and disclosure",
    type: "Contract frame",
    objective: "Distinguish effective control from formal security and keep classification separate from disclosure.",
    introduction: "Effective control concerns practical limits on the sovereign's use of cash even without a formal security interest.",
    model: [
      { label: "Formal security", detail: "Is there an express legal security grant in the available instrument?" },
      { label: "Effective control", detail: "Do account or revenue arrangements constrain practical use of cash?" },
      { label: "Inter-loan dependency", detail: "Does one account or revenue pool support more than one facility?" },
      { label: "Disclosure constraint", detail: "What can be shared, at what level, and under whose consent?" },
      { label: "Treatment implication", detail: "How should verified features affect the perimeter and comparability analysis?" },
    ],
    practice: {
      scenario: "Export receipts must flow through an account a lender can block on covenant breach. The instrument has no security grant, and confidentiality restricts disclosure of account terms.",
      question: "What can the team record?",
      options: [
        { label: "The lender holds formal security", correct: false, feedback: "No security grant appears in the available instrument." },
        { label: "The arrangement may create effective control; disclosure is a separate decision", correct: true, feedback: "Functional control can matter without proving formal security, while confidentiality creates its own boundary." },
        { label: "It is an ordinary account because nothing is formally secured", correct: false, feedback: "The ability to block withdrawals can materially constrain the sovereign's use of revenue." },
      ],
    },
    takeaway: "Classify from verified features and keep the disclosure decision separate from contract classification.",
  },
  {
    id: "discipline",
    tab: "Discipline",
    title: "Carry three questions into every Kuvera decision",
    type: "Decision discipline",
    objective: "Act under a deadline with an open dependency without resolving it by assumption.",
    introduction: "Ask what is known, what changes because of it, and what institutional state has actually been reached.",
    model: [
      { label: "Evidence", detail: "What do I actually know, and what remains reported, challenged, or unknown?" },
      { label: "Decision", detail: "Does the fact change liquidity, perimeter, disclosure, timing, authority, or assurance sufficiency?" },
      { label: "State", detail: "Has the process reached proposal, assurance, agreement, implementation, or effective relief?" },
    ],
    practice: {
      scenario: "One day before submission, the team cannot confirm whether a second facility draws on the same revenue pool. The answer would change the treatment perimeter.",
      question: "What is the defensible move?",
      options: [
        { label: "Miss the deadline until certainty arrives", correct: false, feedback: "The deadline is itself a constraint; waiting can cost more than carrying the dependency explicitly." },
        { label: "Submit with the dependency unresolved and state what it would change", correct: true, feedback: "This keeps the package honest, usable, and open to a clean revision." },
        { label: "Use the most favorable assumption", correct: false, feedback: "That hides the dependency and weakens the basis of the package." },
      ],
    },
    takeaway: "Make unresolved dependencies explicit, and remember that analysis does not create authority.",
  },
];

export const CASE_FILE_SECTIONS: readonly CaseFileSection[] = [
  {
    id: "country",
    title: "Country Profile",
    lead: "Kuvera is a lower-middle-income economy in southeastern Africa built on copper and cobalt. Price weakness, pandemic-era spending, and reserve depletion pushed debt beyond the level the IMF assesses as sustainable.",
    records: [
      { label: "Commodity dependence", value: "40% of government revenue", detail: "Copper and cobalt are central to fiscal capacity; no more granular revenue composition is supplied." },
      { label: "Debt stress", value: "Debt/GDP above 85%", detail: "Debt service consumes more than one-third of government revenue. These are bounds, not precise point estimates." },
      { label: "Private instrument", value: `USD ${CASE_FACTS.maturityUsdMillions}m Eurobond`, detail: "New York law, with a 75% collective-action threshold, negative pledge, and cross-default clause." },
      { label: "Institutional deadlines", value: `${CASE_FACTS.maturityWeeks} weeks / ${CASE_FACTS.imfBoardHorizonWeeks} weeks`, detail: "The Eurobond maturity precedes the IMF Board horizon. Neither deadline is derived from the workshop clock." },
    ],
    boundaries: [
      "Facility A references RA-01; Facility B's relationship to RA-01 is unconfirmed at entry.",
      "The case does not provide a complete annual macro series or aggregate official-bilateral exposure.",
      "Usable liquidity, permitted disclosure, and creditor commitment status must be established through evidence.",
    ],
  },
  {
    id: "indicators",
    title: "Macro Indicators",
    lead: "The Case File provides decision anchors rather than a full DSA workbook. The key distinction is between cash Kuvera reports and cash it can actually use.",
    records: [
      { label: "Reported liquidity", value: `USD ${CASE_FACTS.reportedLiquidityUsdMillions}m`, detail: "Possible restrictions are indicated, but the restriction, protected balance, and usable result are not established in the static Case File." },
      { label: "Debt status", value: "Unsustainable", detail: "This is the IMF scenario assessment; the complete debt path and target ratio are not supplied." },
      { label: "Board horizon", value: `${CASE_FACTS.imfBoardHorizonWeeks} weeks`, detail: "Information, treatment framing, and financing assurances must support Board consideration within this institutional horizon." },
      { label: "Comparability", value: "Three dimensions", detail: "Nominal debt service, debt-stock NPV, and duration must be considered together; no fixed weighting or single formula is supplied." },
    ],
    boundaries: [
      "Do not treat reported cash as verified usable liquidity.",
      "No target haircut, NPV reduction, or complete restructuring envelope is established by the participant record.",
    ],
  },
  {
    id: "creditors",
    title: "Creditor Landscape",
    lead: "No actor begins with the whole picture. Each institution has a distinct information endowment, decision role, and dependency on another actor.",
    records: [
      { label: "Debtor Finance Ministry", value: "Frames and submits", detail: "Requests verification and recommends disclosure, but depends on Treasury, Legal, creditors, and the Finance Ministry Lead." },
      { label: "OCC Secretariat", value: "Coordinates official creditors", detail: "Needs enough debtor disclosure to assess the treatment perimeter and Comparability of Treatment." },
      { label: "Official bilateral creditors", value: "Negotiate treatment", detail: "Paris Club and non-Paris creditors hold different loan information and internal approval authority." },
      { label: "Private creditor committee", value: `USD ${CASE_FACTS.maturityUsdMillions}m Eurobond`, detail: "Needs bilateral treatment and collateral-protection evidence to assess burden sharing and possible bond implications." },
      { label: "IMF staff and Board", value: "DSA and adequacy assessment", detail: "Depend on information and commitment signals from multiple creditor classes; the IMF does not restructure its own claims here." },
    ],
    boundaries: [
      "Verification, approvals, and data assembly take time across several institutions.",
      "Do not attribute every delay to one creditor group or treat an indicative position as an authorized commitment.",
    ],
  },
  {
    id: "contracts",
    title: "Contracts & Escrow",
    lead: "The dossier is a partially known record, not a decoded contract. Terms marked unresolved remain unresolved until evidence returns.",
    records: [
      { label: "RA-01", value: "Copper Revenue Account", detail: "Copper-export proceeds enter the arrangement; exact control, Treasury access, and treatment classification are unresolved at entry." },
      { label: "Facility A", value: "RA-01 reference known", detail: "The exact account controls, financial terms, and any shared-pool dependency require evidence." },
      { label: "Facility B", value: "Linkage unresolved", detail: "A separate agreement exists, but the shared Case File does not establish whether it references RA-01." },
      { label: "Disclosure", value: "Permission unresolved", detail: "The record indicates confidentiality but does not establish whether full, redacted, summary, or withheld disclosure is authorized." },
      { label: "Formal security", value: "Not established", detail: "Participants must distinguish a legal security grant from practical effective control." },
    ],
    boundaries: [
      "The static dossier does not establish the usable-liquidity result, Facility B linkage, or permitted disclosure route.",
      "A clause label alone does not decide security characterization, bond triggers, or the treatment perimeter.",
    ],
  },
  {
    id: "process",
    title: "Common Framework",
    lead: "The case uses a bounded process sequence. Real cases vary, and the distance between a creditor signal and cash-effective relief must remain visible.",
    records: [
      { label: "1–3", value: "Request, coordination, and programme frame", detail: "The debtor requests treatment; an Official Creditor Committee coordinates; the DSA and IMF programme frame the needed treatment." },
      { label: "4", value: "Financing assurances", detail: "Creditor signals are assessed for adequacy for Board purposes; they are not final implementation." },
      { label: "5–6", value: "Parameters and MoU", detail: "Terms become more specific and may be recorded in a legally non-binding memorandum under the source framework." },
      { label: "7–8", value: "Bilateral implementation and effective relief", detail: "Creditor-specific documentation and operations precede an actual debt-service or liquidity effect." },
      { label: "Comparability of Treatment", value: "Debt service, NPV, duration", detail: "Trade-offs across all three dimensions must be made explicit rather than reduced to one haircut number." },
    ],
    boundaries: [
      "Do not equate financing assurances with final agreements, an MoU with implementation, or implementation progress with cash-effective relief.",
      "Kuvera's creditor commitment status remains unresolved until authorized evidence returns.",
    ],
  },
  {
    id: "research",
    title: "Evidence Basis",
    lead: "Approved research explains mechanisms and questions. It does not establish Kuvera-specific balances, control terms, facility linkage, disclosure permission, or commitment status.",
    records: [
      { label: "How China Collateralizes · report pp. 14–17", value: "Revenue routing and usable cash", detail: "RTL-FA-002 · CLAIM-HCC-002. Revenue claims can restrict treasury use; do not universalize the dataset to every loan." },
      { label: "How China Collateralizes · report pp. 21–24", value: "Shared pools and inter-loan dependency", detail: "RTL-FA-003 · CLAIM-HCC-004. Shared cash pools can support more than one loan; do not infer a competing-creditor relationship where the evidence concerns one creditor." },
      { label: "How China Lends · report pp. 6–8 and 22–25", value: "Confidentiality clauses", detail: "RTL-FA-004 · CLAIM-HCL-002. Contract evidence can explain disclosure constraints without proving bad faith, illegality, or actual nondisclosure." },
      { label: "How China Collateralizes · report pp. 17–20", value: "Effective control without formal security", detail: "RTL-FA-008 · CLAIM-HCC-003. Functional control can matter without guaranteeing enforcement or identical legal effects." },
      { label: "Common Framework for Debt Treatments beyond the DSSI · PDF p. 1", value: "Process and commercially sensitive information", detail: "RTL-FA-009 · CLAIM-CF-003. Information provision must coexist with respect for sensitive information; not every creditor automatically receives all contract details." },
    ],
    boundaries: [
      "Research does not replace or manufacture facts that are absent from the Kuvera record.",
      "The exercise records decisions and revisions; it does not infer competence, motive, legality, or real-world outcomes.",
    ],
  },
];

export const GLOSSARY_TERMS = [
  { term: "Debt Management Office (DMO)", definition: "The Finance Ministry function that maintains the debt record, reconciles claims, maps dependencies, and prepares recommendations without creating sovereign or creditor commitments." },
  { term: "Usable liquidity", definition: "Cash actually available after restrictions, protected balances, and control arrangements are accounted for." },
  { term: "Restricted account", definition: "An account whose balances or payment flows are constrained by contractual controls and may not be fully available to the sovereign." },
  { term: "Effective control", definition: "A practical constraint on the sovereign's access to cash flows, even without formal collateral in the traditional legal sense." },
  { term: "Financing assurance", definition: "A creditor indication that can give the IMF sufficient confidence in the financing envelope before final legal implementation." },
  { term: "Official Creditor Committee (OCC)", definition: "The committee through which participating official bilateral creditors coordinate treatment discussions and assurances under the Common Framework." },
  { term: "Treatment perimeter", definition: "The set of claims or facilities carried into restructuring and comparability analysis." },
  { term: "Comparability of Treatment (CoT)", definition: "Assessment of whether other creditors provide comparable treatment across debt-service, net-present-value, and duration dimensions." },
  { term: "IMF Board horizon", definition: `The ${CASE_FACTS.imfBoardHorizonWeeks}-week scenario deadline for information, treatment framing, and adequate financing assurances to support Board consideration.` },
] as const;

export const ADVISOR_PROFILES: Record<AdvisorId, { name: string; shortName: string; role: string; bio: string; image: string; brief: string; greeting: string; welcome: string; suggestions: readonly string[] }> = {
  amara: {
    name: "Amara Okoye",
    shortName: "Amara",
    role: "Country, macroeconomic context & Common Framework advisor",
    bio: "Sovereign debt economist · fifteen years on Paris Club and Common Framework cases",
    image: "/img/Amara Okoye.jpg",
    greeting: "Hello, I'm Amara. Where would you like to begin: Kuvera's fiscal position, its creditor landscape, or the Common Framework sequence?",
    brief: "The Kuvera country profile, debt-sustainability context, creditor composition and IMF Board horizon—plus the Common Framework sequence from debtor request through financing assurances, the OCC, and the MoU to cash-effective relief.",
    welcome: "Welcome. I'm Amara, your Kuvera country and Common Framework advisor. I can help you interpret the country profile, debt sustainability context, creditor composition, and the difference between source-backed case facts and exercise-only assumptions. I can also walk you through where Kuvera sits in the Common Framework process, what financing assurances are meant to establish, how the Official Creditor Committee (OCC) and IMF program parameters fit together, and what happens from an MoU through bilateral implementation. I'll explain the process and evidence available to you, but I won't make the decision for you.",
    suggestions: ["Why is Kuvera in debt distress?", "Where is Kuvera in the Common Framework process?", "What are financing assurances?", "What happens after an MoU?", "Which numbers are exercise-only assumptions?"],
  },
  daniel: {
    name: "Daniel Mensah",
    shortName: "Daniel",
    role: "Contracts, escrow & Comparability of Treatment advisor",
    bio: "Sovereign finance lawyer · collateralised lending and restructuring documentation",
    image: "/img/Daniel Mensah.jpg",
    greeting: "Hello, I'm Daniel. What should we examine first: the facilities, account control, disclosure, or comparability of treatment?",
    brief: "Facility A and B, the copper-revenue account, confidentiality and cross-collateralization, formal security versus effective control, disclosure choices and commitment levels—plus the three Comparability of Treatment dimensions.",
    welcome: "Welcome. I'm Daniel Mensah, your contracts, escrow, financing assurances, and comparability advisor. I can help you work through Facility A, Facility B, the copper-revenue account, confidentiality constraints, cross-collateralization, and the distinction between formal security and effective control. I can also explain commitment levels, what counts as a financing assurance, the three Comparability of Treatment dimensions used in this simulation, and how treatment terms connect to the financing-assurances package. I'll help you interpret the evidence and trade-offs, but I won't classify an unresolved account or tell you which option to choose.",
    suggestions: ["What do we know about the escrow account?", "What is cross-collateralization here?", "What counts as an assurance?", "Why is CoT not one haircut number?", "What are the three CoT dimensions?"],
  },
};

export const ADVISOR_BASELINE_CONTEXT = `At entry, Kuvera reports USD ${CASE_FACTS.reportedLiquidityUsdMillions}m in liquidity, and a partial memo indicates possible restrictions that have not been reconciled. Facility A references ${CASE_FACTS.facilityAAccount}; Facility B's relationship to the account is ${CASE_FACTS.facilityBEntryStatus}. Permitted disclosure and the creditor's commitment status begin unresolved. A USD ${CASE_FACTS.maturityUsdMillions}m maturity arrives in ${CASE_FACTS.maturityWeeks} weeks, five weeks before the ${CASE_FACTS.imfBoardHorizonWeeks}-week IMF Board horizon.`;

export const REPORT_LABELS = {
  reportTitle: "After-Action Report",
  briefTitle: "Negotiation-preparation brief",
  evidenceTitle: "Evidence incorporation",
  transferTitle: "Transfer reflection",
  workshopComparisonTitle: "Workshop comparison",
} as const;

export const RECOMMENDATION_CLAIM_LABELS: Record<MaterialRecommendationClaim, string> = {
  LIQUIDITY_BASIS: "Liquidity basis",
  ACCOUNT_CLASSIFICATION: "Account classification",
  FACILITY_LINKAGE: "Facility A/B linkage",
  DISCLOSURE_RECOMMENDATION: "Disclosure recommendation",
  TREATMENT_PERIMETER: "Treatment perimeter",
  READINESS_POSITION: "Readiness position",
};

export const INJECT_PRESETS = [
  {
    title: "Maturity desk update",
    body: `The USD ${CASE_FACTS.maturityUsdMillions}m maturity remains ${CASE_FACTS.maturityWeeks} weeks away. Any recommendation relying on the ${CASE_FACTS.imfBoardHorizonWeeks}-week Board horizon must address the intervening financing risk.`,
  },
  {
    title: "OCC clarification request",
    body: "The OCC asks Kuvera to distinguish reported cash from usable liquidity and identify any shared facility-account dependencies.",
  },
  {
    title: "Creditor authorization update",
    body: "The policy-bank delegation confirms that its current position remains indicative and subject to headquarters authorization.",
  },
];

export const SCENARIO_DEFINITION = {
  identity: {
    workshopTitle: WORKSHOP_TITLE,
    exerciseTitle: EXERCISE_TITLE,
    roleTitle: ROLE_TITLE,
  },
  facts: CASE_FACTS,
  roleBoundary: ROLE_BOUNDARY,
  stages: STAGES,
  facilitatorStageGuides: FACILITATOR_STAGE_GUIDES,
  evidence: EVIDENCE_CATALOG,
  orientation: ORIENTATION_STEPS,
  learningBridge: LEARNING_BRIDGE_CHAPTERS,
  caseFile: CASE_FILE_SECTIONS,
  glossary: GLOSSARY_TERMS,
  advisorProfiles: ADVISOR_PROFILES,
  reportLabels: REPORT_LABELS,
  recommendationClaimLabels: RECOMMENDATION_CLAIM_LABELS,
} as const;
