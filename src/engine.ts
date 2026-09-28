import { EVIDENCE_CATALOG } from "./scenario";
import type {
  ActivityEvent,
  AdvisorTurn,
  AfterActionReport,
  Consequence,
  Counterfactual,
  DecisionState,
  EvidenceRequest,
  GlobalInject,
  InstitutionalMessage,
  ParticipantProfile,
  Submission,
  WorkshopSession,
} from "./types";

export function evidenceIsAvailable(request: EvidenceRequest, now = new Date()): boolean {
  return request.releasedAt !== undefined || new Date(request.availableAt).getTime() <= now.getTime();
}

export function deriveConsequences(decisions: DecisionState): Consequence[] {
  const consequences: Consequence[] = [];

  if (decisions.liquidityAction === "VERIFY_NOW") {
    consequences.push({
      id: "verification-time",
      title: "Verification consumed scarce time",
      outcome: "The DMO delayed its initial package while Treasury and Legal reconciled the account, but obtained a defensible usable-liquidity basis.",
      basis: "Authored consequence rule: early verification trades time for evidence quality.",
      severity: "CAUTION",
    });
  } else if (decisions.liquidityAction === "PROCEED_WITH_CAVEAT") {
    consequences.push({
      id: "provisional-liquidity",
      title: "The initial package retained liquidity uncertainty",
      outcome: "Coordination began earlier, but the OCC could not treat USD 780m as usable cash and requested clarification.",
      basis: "Authored consequence rule: a caveat preserves uncertainty; it does not verify the figure.",
      severity: "CAUTION",
    });
  }

  if (decisions.liquidityBasis === "VERIFIED_480") {
    consequences.push({
      id: "verified-basis",
      title: "Usable liquidity was corrected to USD 480m",
      outcome: "The package uses USD 480m as the verified usable-liquidity basis after distinguishing USD 240m restricted and USD 60m protected from the USD 780m reported balance.",
      basis: "Deterministic reconciliation: 780 - 240 - 60 = 480.",
      severity: "POSITIVE",
    });
  } else {
    consequences.push({
      id: "unreconciled-basis",
      title: "Liquidity remained provisional",
      outcome: "The package cannot rely on the gross USD 780m figure as freely usable resources.",
      basis: "The restricted and protected balances were not incorporated into the submitted basis.",
      severity: "BLOCKING",
    });
  }

  if (decisions.facilityLinkage === "SHARED_POOL") {
    consequences.push({
      id: "shared-pool",
      title: "The treatment perimeter reflects the shared revenue pool",
      outcome: "Facilities A and B are carried as linked for dependency analysis, without claiming that they are legally identical.",
      basis: "Scenario fact: both facilities depend on RA-01.",
      severity: "POSITIVE",
    });
  } else {
    consequences.push({
      id: "linkage-gap",
      title: "The treatment perimeter contains a facility-linkage gap",
      outcome: "Facility B may be assessed as independent even though canonical scenario state links it to the same controlled revenue pool.",
      basis: "Authored dependency rule for Facilities A and B.",
      severity: "BLOCKING",
    });
  }

  if (decisions.disclosure === "FULL") {
    consequences.push({
      id: "full-disclosure",
      title: "Coordination improved, but the confidentiality boundary was crossed",
      outcome: "The OCC receives complete account terms, while Kuvera creates a scenario-level confidentiality consequence because consent was not established.",
      basis: "Authored disclosure rule; this is not a finding of illegality or bad faith.",
      severity: "CAUTION",
    });
  } else if (decisions.disclosure === "REDACTED") {
    consequences.push({
      id: "redacted-disclosure",
      title: "A bounded functional summary supports coordination",
      outcome: "The OCC receives the material control and dependency facts without receiving restricted contract text.",
      basis: "Scenario legal opinion permits a redacted functional summary.",
      severity: "POSITIVE",
    });
  } else if (decisions.disclosure === "WITHHOLD") {
    consequences.push({
      id: "withheld-disclosure",
      title: "Confidentiality was preserved, but the OCC information gap remained",
      outcome: "The treatment-perimeter discussion proceeds with a material unresolved dependency.",
      basis: "Authored disclosure rule: withholding protects information but does not resolve coordination need.",
      severity: "BLOCKING",
    });
  }

  if (decisions.readiness === "READY" && consequences.some((item) => item.severity === "BLOCKING")) {
    consequences.push({
      id: "readiness-mismatch",
      title: "The readiness label exceeds the evidence state",
      outcome: "The recommendation says ready while a blocking uncertainty remains visible in the same submission.",
      basis: "Readiness must remain consistent with unresolved evidence and dependencies.",
      severity: "BLOCKING",
    });
  }

  return consequences;
}

export function deriveCounterfactuals(decisions: DecisionState): Counterfactual[] {
  const items: Counterfactual[] = [];
  if (decisions.liquidityAction !== "VERIFY_NOW") {
    items.push({
      id: "verify-earlier",
      alternative: "Request Treasury and account-control verification before using the gross figure.",
      projectedDifference: "The initial package would arrive later but would use USD 480m as the supported usable-liquidity basis.",
      fixedAssumptions: "Account terms, balances, deadlines, and all later scenario rules remain unchanged.",
    });
  } else {
    items.push({
      id: "defer-verification",
      alternative: "Proceed immediately with the USD 780m report under an explicit caveat.",
      projectedDifference: "Coordination would begin earlier, but the OCC would retain a material liquidity question and later revision cost.",
      fixedAssumptions: "The same restricted and protected balances are eventually revealed.",
    });
  }
  if (decisions.disclosure !== "REDACTED") {
    items.push({
      id: "redacted-summary",
      alternative: "Provide the legally bounded redacted functional summary.",
      projectedDifference: "The OCC would receive material control and linkage facts without full contract text.",
      fixedAssumptions: "No additional creditor consent is granted.",
    });
  }
  if (decisions.facilityLinkage !== "SHARED_POOL") {
    items.push({
      id: "map-shared-pool",
      alternative: "Carry both facilities inside the dependency analysis.",
      projectedDifference: "The treatment perimeter would align with the authored RA-01 dependency and avoid treating Facility B as operationally independent.",
      fixedAssumptions: "This changes dependency treatment, not the legal character of either facility.",
    });
  }
  return items;
}

export function unresolvedRiskList(decisions: DecisionState): string[] {
  const risks: string[] = [];
  if (decisions.liquidityBasis !== "VERIFIED_480") risks.push("Usable liquidity is not verified at USD 480m.");
  if (decisions.accountClassification === "UNRESOLVED" || !decisions.accountClassification) risks.push("Account-control classification remains unresolved.");
  if (decisions.facilityLinkage !== "SHARED_POOL") risks.push("The shared Facility A/B revenue-pool dependency is not incorporated.");
  if (decisions.disclosure === "WITHHOLD") risks.push("The OCC lacks material account-control information.");
  if (decisions.treatmentPerimeter === "FACILITY_A_ONLY") risks.push("Facility B is outside the proposed perimeter despite the shared-pool dependency.");
  if (decisions.unresolvedRisks.trim()) risks.push(decisions.unresolvedRisks.trim());
  return risks;
}

export function buildAfterActionReport(input: {
  participant: ParticipantProfile;
  session: WorkshopSession;
  decisions: DecisionState;
  evidenceRequests: EvidenceRequest[];
  submissions: Submission[];
  advisorTurns: AdvisorTurn[];
  injects: GlobalInject[];
  institutionalMessages: InstitutionalMessage[];
  timeline: ActivityEvent[];
}): AfterActionReport {
  const requestedIds = new Set(input.evidenceRequests.map((request) => request.evidenceId));
  const ignoredIds = new Set<string>();
  if (requestedIds.has("treasury-reconciliation") && input.decisions.liquidityBasis !== "VERIFIED_480") ignoredIds.add("treasury-reconciliation");
  if (requestedIds.has("account-control") && input.decisions.accountClassification !== "EFFECTIVE_CONTROL") ignoredIds.add("account-control");
  if ((requestedIds.has("facility-b") || requestedIds.has("cross-collateralization")) && input.decisions.facilityLinkage !== "SHARED_POOL") {
    if (requestedIds.has("facility-b")) ignoredIds.add("facility-b");
    if (requestedIds.has("cross-collateralization")) ignoredIds.add("cross-collateralization");
  }
  if (requestedIds.has("confidentiality-opinion") && input.decisions.disclosure !== "REDACTED") ignoredIds.add("confidentiality-opinion");
  const consequences = deriveConsequences(input.decisions);
  const risks = unresolvedRiskList(input.decisions);
  const readiness = input.decisions.readiness?.replaceAll("_", " ").toLowerCase() ?? "not submitted";
  return {
    participant: {
      id: input.participant.id,
      name: input.participant.name,
      organization: input.participant.organization,
      email: input.participant.email,
    },
    session: {
      id: input.session.id,
      title: input.session.title,
      kind: input.session.kind,
      createdAt: input.session.createdAt,
    },
    generatedAt: new Date().toISOString(),
    executiveSummary: `${input.participant.name} submitted a ${readiness} Debt Management Office recommendation. The record contains ${input.submissions.length} submission version${input.submissions.length === 1 ? "" : "s"}, ${requestedIds.size} evidence request${requestedIds.size === 1 ? "" : "s"}, and ${risks.length} unresolved risk${risks.length === 1 ? "" : "s"}.`,
    decisions: input.decisions,
    submissions: [...input.submissions].sort((a, b) => a.version - b.version),
    evidenceRequested: EVIDENCE_CATALOG.filter((item) => requestedIds.has(item.id)),
    evidenceNotRequested: EVIDENCE_CATALOG.filter((item) => !requestedIds.has(item.id)),
    evidenceIgnored: EVIDENCE_CATALOG.filter((item) => ignoredIds.has(item.id)),
    evidenceRequestHistory: input.evidenceRequests,
    institutionalMessages: input.institutionalMessages,
    consequences,
    counterfactuals: deriveCounterfactuals(input.decisions),
    unresolvedRisks: risks,
    advisorUsage: input.advisorTurns,
    facilitatorInjects: input.injects,
    timeline: [...input.timeline].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}
