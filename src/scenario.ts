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
