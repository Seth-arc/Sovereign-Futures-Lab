import type { EvidenceDefinition } from "./types";

export const WORKSHOP_TITLE = "A Data-Informed Simulation for African Foresight Practice";
export const EXERCISE_TITLE = "Kuvera Financing Assurances";
export const ROLE_TITLE = "Debt Management Office";
export const FACILITATOR_EMAIL = "snguna@aiddata.wm.edu";

export const STAGES = [
  {
    title: "Confirm mandate",
    short: "Mandate",
    objective: "Separate the DMO's record, analysis, and recommendation authority from sovereign commitment authority.",
  },
  {
    title: "Diagnose liquidity",
    short: "Liquidity",
    objective: "Decide whether the reported USD 780m can support the current package or needs verification.",
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
    details: "Reported liquidity is USD 780m. USD 240m is restricted and USD 60m is protected. The resulting usable-liquidity basis is USD 480m.",
  },
  {
    id: "account-control",
    title: "Restricted-account control terms",
    requestedFrom: "Treasury and Legal",
    delaySeconds: 45,
    summary: "Identifies withdrawal, replenishment, and creditor-control conditions.",
    sourceLabel: "Revenue Account RA-01 control summary · case record",
    details: "Copper-export receipts enter RA-01. Withdrawals below the protected balance require policy-bank consent, and scheduled debt service is swept before residual funds become available to Kuvera.",
  },
  {
    id: "facility-a",
    title: "Facility A agreement extract",
    requestedFrom: "Legal Counsel",
    delaySeconds: 30,
    summary: "Provides the account covenant and payment-waterfall terms for Facility A.",
    sourceLabel: "Facility A agreement extract · case record",
    details: "Facility A requires specified export proceeds to flow through RA-01 and applies the account waterfall to scheduled Facility A debt service.",
  },
  {
    id: "facility-b",
    title: "Facility B agreement extract",
    requestedFrom: "Legal Counsel",
    delaySeconds: 55,
    summary: "Tests whether Facility B cross-references the revenue-account arrangement.",
    sourceLabel: "Facility B agreement extract · case record",
    details: "Facility B incorporates the common revenue-account schedule by reference. Its payment support therefore depends on the same RA-01 pool used by Facility A.",
  },
  {
    id: "cross-collateralization",
    title: "Cross-collateralization review",
    requestedFrom: "Debt and Legal Review",
    delaySeconds: 65,
    summary: "Tests whether the two facilities may be assessed independently.",
    sourceLabel: "Kuvera facility dependency review · case record",
    details: "The facilities are not formally secured by identical assets, but they share the same controlled revenue pool. Treating Facility B as operationally independent would omit a material dependency.",
  },
  {
    id: "confidentiality-opinion",
    title: "Legal confidentiality opinion",
    requestedFrom: "Legal Counsel",
    delaySeconds: 50,
    summary: "Defines what may be disclosed without reproducing restricted contract text.",
    sourceLabel: "Kuvera Legal disclosure opinion · case record",
    details: "Kuvera may provide a redacted functional summary of account control, affected balances, and cross-facility dependency. Full contract text requires consent under the scenario confidentiality clause.",
  },
  {
    id: "creditor-status",
    title: "Creditor commitment-status clarification",
    requestedFrom: "Policy-bank creditor delegation",
    delaySeconds: 70,
    summary: "Separates an indicative position from an authorized commitment.",
    sourceLabel: "Creditor commitment-status clarification · case record",
    details: "The creditor has provided an indicative willingness to engage. Headquarters authorization remains outstanding; the statement is not a financing assurance or agreement in principle.",
  },
  {
    id: "occ-request",
    title: "OCC information request",
    requestedFrom: "OCC Secretariat",
    delaySeconds: 25,
    summary: "Clarifies the minimum information needed for the treatment-perimeter discussion.",
    sourceLabel: "Official Creditor Committee Secretariat request · case record",
    details: "The OCC requests the usable-liquidity basis, a functional account-control summary, affected facilities, and explicit identification of unresolved commitment status.",
  },
  {
    id: "imf-clarification",
    title: "IMF financing-assurances clarification",
    requestedFrom: "IMF Technical Staff",
    delaySeconds: 40,
    summary: "Clarifies the distinction between package readiness and later implementation.",
    sourceLabel: "IMF financing-assurances clarification · case record",
    details: "The Board horizon requires credible financing assurances, but an assurance remains distinct from agreement in principle, an MoU, bilateral implementation, and cash-effective relief.",
  },
];

export const INJECT_PRESETS = [
  {
    title: "Maturity desk update",
    body: "The USD 750m maturity remains six weeks away. Any recommendation relying on the eleven-week Board horizon must address the intervening financing risk.",
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
