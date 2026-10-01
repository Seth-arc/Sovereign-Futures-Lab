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
  RecommendationReview,
  Submission,
  WorkshopSession,
} from "./types";

export function evidenceIsAvailable(request: EvidenceRequest, now = new Date()): boolean {
  const reviewTime = now.getTime();
  const releasedByReview = request.releasedAt !== undefined && new Date(request.releasedAt).getTime() <= reviewTime;
  return releasedByReview || new Date(request.availableAt).getTime() <= reviewTime;
}

export function reviewRecommendation(input: {
  decisions: DecisionState;
  evidenceRequests: EvidenceRequest[];
  reviewedAt: Date | string;
}): RecommendationReview {
  const reviewedAt = typeof input.reviewedAt === "string" ? new Date(input.reviewedAt) : input.reviewedAt;
  const availableIds = new Set(input.evidenceRequests
    .filter((request) => evidenceIsAvailable(request, reviewedAt))
    .map((request) => request.evidenceId));
  const has = (evidenceId: string) => availableIds.has(evidenceId);
  const linkageEvidence = ["facility-b", "cross-collateralization"].filter(has);

  const liquidity = (() => {
    if (!input.decisions.liquidityBasis || input.decisions.liquidityBasis === "UNRESOLVED") return {
      claim: "LIQUIDITY_BASIS" as const,
      label: "Liquidity basis",
      recordedClaim: input.decisions.liquidityBasis === "UNRESOLVED" ? "Unresolved" : "Not recorded",
      status: "UNRESOLVED" as const,
      explanation: "The recommendation preserves that usable liquidity has not been established.",
      evidenceIds: [],
    };
    if (input.decisions.liquidityBasis === "REPORTED_780") return has("treasury-reconciliation") ? {
      claim: "LIQUIDITY_BASIS" as const,
      label: "Liquidity basis",
      recordedClaim: "USD 780m reported, not verified",
      status: "UNSUPPORTED" as const,
      explanation: "The returned Treasury reconciliation establishes USD 480m as usable liquidity; USD 780m remains only the gross reported balance.",
      evidenceIds: ["treasury-reconciliation"],
    } : {
      claim: "LIQUIDITY_BASIS" as const,
      label: "Liquidity basis",
      recordedClaim: "USD 780m reported, not verified",
      status: "SUPPORTED" as const,
      explanation: "The shared case record supports USD 780m only as a reported, provisional figure.",
      evidenceIds: [],
    };
    return has("treasury-reconciliation") ? {
      claim: "LIQUIDITY_BASIS" as const,
      label: "Liquidity basis",
      recordedClaim: "USD 480m verified usable",
      status: "SUPPORTED" as const,
      explanation: "The returned Treasury reconciliation establishes the USD 480m usable-liquidity basis.",
      evidenceIds: ["treasury-reconciliation"],
    } : {
      claim: "LIQUIDITY_BASIS" as const,
      label: "Liquidity basis",
      recordedClaim: "USD 480m verified usable",
      status: "UNSUPPORTED" as const,
      explanation: "The Treasury cash reconciliation has not returned, so USD 480m is not established in the available record.",
      evidenceIds: [],
    };
  })();

  const account = (() => {
    if (!input.decisions.accountClassification || input.decisions.accountClassification === "UNRESOLVED") return {
      claim: "ACCOUNT_CLASSIFICATION" as const,
      label: "Account classification",
      recordedClaim: input.decisions.accountClassification === "UNRESOLVED" ? "Unresolved" : "Not recorded",
      status: "UNRESOLVED" as const,
      explanation: "The recommendation preserves that the account-control classification is not established.",
      evidenceIds: [],
    };
    if (input.decisions.accountClassification === "EFFECTIVE_CONTROL") {
      if (has("account-control")) return {
        claim: "ACCOUNT_CLASSIFICATION" as const,
        label: "Account classification",
        recordedClaim: "Quasi-collateral / effective control",
        status: "SUPPORTED" as const,
        explanation: "The returned account-control terms establish consent and payment-sweep constraints.",
        evidenceIds: ["account-control"],
      };
      if (has("facility-a")) return {
        claim: "ACCOUNT_CLASSIFICATION" as const,
        label: "Account classification",
        recordedClaim: "Quasi-collateral / effective control",
        status: "CONDITIONAL" as const,
        explanation: "Facility A confirms an account waterfall, but the withdrawal and control terms remain open.",
        evidenceIds: ["facility-a"],
      };
      return {
        claim: "ACCOUNT_CLASSIFICATION" as const,
        label: "Account classification",
        recordedClaim: "Quasi-collateral / effective control",
        status: "UNSUPPORTED" as const,
        explanation: "The restricted-account control terms have not returned, so effective control is not established.",
        evidenceIds: [],
      };
    }
    return {
      claim: "ACCOUNT_CLASSIFICATION" as const,
      label: "Account classification",
      recordedClaim: "Ordinary operating account",
      status: "UNSUPPORTED" as const,
      explanation: has("account-control")
        ? "The returned account-control terms conflict with an ordinary-account classification."
        : "The available record does not establish that RA-01 is an ordinary operating account.",
      evidenceIds: has("account-control") ? ["account-control"] : [],
    };
  })();

  const facilityLinkage = (() => {
    if (!input.decisions.facilityLinkage || input.decisions.facilityLinkage === "UNRESOLVED") return {
      claim: "FACILITY_LINKAGE" as const,
      label: "Facility A/B linkage",
      recordedClaim: input.decisions.facilityLinkage === "UNRESOLVED" ? "Unresolved" : "Not recorded",
      status: "UNRESOLVED" as const,
      explanation: "The recommendation preserves that Facility B's relationship to RA-01 is unconfirmed.",
      evidenceIds: [],
    };
    if (input.decisions.facilityLinkage === "SHARED_POOL") {
      if (linkageEvidence.length) return {
        claim: "FACILITY_LINKAGE" as const,
        label: "Facility A/B linkage",
        recordedClaim: "Shared revenue pool",
        status: "SUPPORTED" as const,
        explanation: "Returned Facility B or dependency evidence establishes the shared RA-01 revenue pool.",
        evidenceIds: linkageEvidence,
      };
      if (has("facility-a")) return {
        claim: "FACILITY_LINKAGE" as const,
        label: "Facility A/B linkage",
        recordedClaim: "Shared revenue pool",
        status: "CONDITIONAL" as const,
        explanation: "Facility A's RA-01 link is available, but Facility B or dependency evidence has not returned.",
        evidenceIds: ["facility-a"],
      };
      return {
        claim: "FACILITY_LINKAGE" as const,
        label: "Facility A/B linkage",
        recordedClaim: "Shared revenue pool",
        status: "UNSUPPORTED" as const,
        explanation: "Facility B or dependency evidence has not returned, so a shared pool is not established.",
        evidenceIds: [],
      };
    }
    return {
      claim: "FACILITY_LINKAGE" as const,
      label: "Facility A/B linkage",
      recordedClaim: "Independent facilities",
      status: "UNSUPPORTED" as const,
      explanation: linkageEvidence.length
        ? "Returned Facility B or dependency evidence conflicts with treating the facilities as independent."
        : "The available record does not establish that Facility B is independent of RA-01.",
      evidenceIds: linkageEvidence,
    };
  })();

  const disclosure = (() => {
    if (!input.decisions.disclosure) return {
      claim: "DISCLOSURE_RECOMMENDATION" as const,
      label: "Disclosure recommendation",
      recordedClaim: "Not recorded",
      status: "UNRESOLVED" as const,
      explanation: "No disclosure recommendation has been recorded.",
      evidenceIds: [],
    };
    if (input.decisions.disclosure === "REDACTED") return has("confidentiality-opinion") ? {
      claim: "DISCLOSURE_RECOMMENDATION" as const,
      label: "Disclosure recommendation",
      recordedClaim: "Redacted functional summary",
      status: "SUPPORTED" as const,
      explanation: "The returned legal opinion permits a redacted functional summary.",
      evidenceIds: ["confidentiality-opinion"],
    } : {
      claim: "DISCLOSURE_RECOMMENDATION" as const,
      label: "Disclosure recommendation",
      recordedClaim: "Redacted functional summary",
      status: "CONDITIONAL" as const,
      explanation: "A functional summary may meet the information need, but the legal confidentiality opinion has not returned.",
      evidenceIds: [],
    };
    if (input.decisions.disclosure === "FULL") return {
      claim: "DISCLOSURE_RECOMMENDATION" as const,
      label: "Disclosure recommendation",
      recordedClaim: "Full contract disclosure",
      status: "UNSUPPORTED" as const,
      explanation: has("confidentiality-opinion")
        ? "The returned legal opinion requires consent for full contract text, and no consent evidence is available."
        : "The legal confidentiality opinion and any consent for full contract text are not available.",
      evidenceIds: has("confidentiality-opinion") ? ["confidentiality-opinion"] : [],
    };
    return {
      claim: "DISCLOSURE_RECOMMENDATION" as const,
      label: "Disclosure recommendation",
      recordedClaim: "Withhold pending consent",
      status: "SUPPORTED" as const,
      explanation: "The available record does not establish permission for unrestricted disclosure, and the recommendation preserves that dependency.",
      evidenceIds: has("confidentiality-opinion") ? ["confidentiality-opinion"] : [],
    };
  })();

  const treatment = (() => {
    if (!input.decisions.treatmentPerimeter || input.decisions.treatmentPerimeter === "DEFER") return {
      claim: "TREATMENT_PERIMETER" as const,
      label: "Treatment perimeter",
      recordedClaim: input.decisions.treatmentPerimeter === "DEFER" ? "Deferred" : "Not recorded",
      status: "UNRESOLVED" as const,
      explanation: "The recommendation preserves that the evidence does not yet define the treatment perimeter.",
      evidenceIds: [],
    };
    if (input.decisions.treatmentPerimeter === "BOTH_FACILITIES") {
      if (linkageEvidence.length) return {
        claim: "TREATMENT_PERIMETER" as const,
        label: "Treatment perimeter",
        recordedClaim: "Facilities A and B",
        status: "SUPPORTED" as const,
        explanation: "Returned Facility B or dependency evidence supports carrying both facilities in the dependency analysis.",
        evidenceIds: linkageEvidence,
      };
      if (has("facility-a")) return {
        claim: "TREATMENT_PERIMETER" as const,
        label: "Treatment perimeter",
        recordedClaim: "Facilities A and B",
        status: "CONDITIONAL" as const,
        explanation: "Facility A's RA-01 link is available, but Facility B's dependency remains open.",
        evidenceIds: ["facility-a"],
      };
      return {
        claim: "TREATMENT_PERIMETER" as const,
        label: "Treatment perimeter",
        recordedClaim: "Facilities A and B",
        status: "UNSUPPORTED" as const,
        explanation: "Facility B or dependency evidence has not returned to support carrying both facilities.",
        evidenceIds: [],
      };
    }
    if (linkageEvidence.length) return {
      claim: "TREATMENT_PERIMETER" as const,
      label: "Treatment perimeter",
      recordedClaim: "Facility A only",
      status: "UNSUPPORTED" as const,
      explanation: "Returned Facility B or dependency evidence conflicts with excluding Facility B from the dependency analysis.",
      evidenceIds: linkageEvidence,
    };
    return has("facility-a") ? {
      claim: "TREATMENT_PERIMETER" as const,
      label: "Treatment perimeter",
      recordedClaim: "Facility A only",
      status: "CONDITIONAL" as const,
      explanation: "Facility A is established, but Facility B's relationship to RA-01 remains open.",
      evidenceIds: ["facility-a"],
    } : {
      claim: "TREATMENT_PERIMETER" as const,
      label: "Treatment perimeter",
      recordedClaim: "Facility A only",
      status: "UNSUPPORTED" as const,
      explanation: "Facility A evidence has not returned, and Facility B's relationship remains open.",
      evidenceIds: [],
    };
  })();

  const materialItems = [liquidity, account, facilityLinkage, disclosure, treatment];
  const unsupported = materialItems.filter((item) => item.status === "UNSUPPORTED");
  const open = materialItems.filter((item) => item.status === "CONDITIONAL" || item.status === "UNRESOLVED");
  const unsupportedLabels = unsupported.map((item) => item.label).join(", ");
  const openLabels = open.map((item) => item.label).join(", ");
  const readiness = (() => {
    if (!input.decisions.readiness) return {
      claim: "READINESS_POSITION" as const,
      label: "Readiness position",
      recordedClaim: "Not recorded",
      status: "UNRESOLVED" as const,
      explanation: "No readiness position has been recorded.",
      evidenceIds: [],
    };
    if (input.decisions.readiness === "NOT_READY") return materialItems.some((item) => item.status !== "SUPPORTED") ? {
      claim: "READINESS_POSITION" as const,
      label: "Readiness position",
      recordedClaim: "Not ready",
      status: "SUPPORTED" as const,
      explanation: "The not-ready posture is consistent with the open or unsupported material claims in this review.",
      evidenceIds: [],
    } : {
      claim: "READINESS_POSITION" as const,
      label: "Readiness position",
      recordedClaim: "Not ready",
      status: "CONDITIONAL" as const,
      explanation: "All reviewed material claims are supported; name any separate dependency keeping the package not ready.",
      evidenceIds: [],
    };
    if (input.decisions.readiness === "READY_WITH_CONDITIONS") return unsupported.length ? {
      claim: "READINESS_POSITION" as const,
      label: "Readiness position",
      recordedClaim: "Ready with conditions",
      status: "UNSUPPORTED" as const,
      explanation: `A condition does not support firm claims that exceed or conflict with the evidence: ${unsupportedLabels}.`,
      evidenceIds: [],
    } : {
      claim: "READINESS_POSITION" as const,
      label: "Readiness position",
      recordedClaim: "Ready with conditions",
      status: "SUPPORTED" as const,
      explanation: open.length
        ? "The conditional posture is consistent with the named open evidence dependencies."
        : "The reviewed material claims are supported, and the posture retains any separately recorded conditions.",
      evidenceIds: [],
    };
    if (unsupported.length) return {
      claim: "READINESS_POSITION" as const,
      label: "Readiness position",
      recordedClaim: "Ready",
      status: "UNSUPPORTED" as const,
      explanation: `The ready posture exceeds material claims that are unsupported by the available evidence: ${unsupportedLabels}.`,
      evidenceIds: [],
    };
    if (open.length) return {
      claim: "READINESS_POSITION" as const,
      label: "Readiness position",
      recordedClaim: "Ready",
      status: "CONDITIONAL" as const,
      explanation: `Readiness is not yet unconditional because these material dependencies remain open: ${openLabels}.`,
      evidenceIds: [],
    };
    return {
      claim: "READINESS_POSITION" as const,
      label: "Readiness position",
      recordedClaim: "Ready",
      status: "SUPPORTED" as const,
      explanation: "Each reviewed material claim is supported by the evidence available at this moment.",
      evidenceIds: [],
    };
  })();
  const readyMismatch = input.decisions.readiness === "READY" && materialItems.some((item) => item.status !== "SUPPORTED");

  return {
    reviewedAt: reviewedAt.toISOString(),
    items: [...materialItems, readiness],
    readyMismatch,
    ...(readyMismatch ? { mismatchExplanation: "READY exceeds the current evidence state. The participant may revise or submit this mismatch; the debrief record will retain it." } : {}),
    submissionAllowed: true,
  };
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
  const submissions = [...input.submissions].sort((a, b) => a.version - b.version);
  const generatedAt = new Date().toISOString();
  const latestSubmission = submissions.at(-1);
  const recommendationReview = reviewRecommendation({
    decisions: latestSubmission?.decisions ?? input.decisions,
    evidenceRequests: input.evidenceRequests,
    reviewedAt: latestSubmission?.submittedAt ?? generatedAt,
  });
  const submissionRecommendationReviews = submissions.map((submission) => ({
    submissionId: submission.id,
    version: submission.version,
    review: reviewRecommendation({
      decisions: submission.decisions,
      evidenceRequests: input.evidenceRequests,
      reviewedAt: submission.submittedAt,
    }),
  }));
  const ignoredIds = new Set(recommendationReview.items
    .filter((item) => item.status === "UNSUPPORTED")
    .flatMap((item) => item.evidenceIds));
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
    generatedAt,
    executiveSummary: `${input.participant.name} submitted a ${readiness} Debt Management Office recommendation. The record contains ${input.submissions.length} submission version${input.submissions.length === 1 ? "" : "s"}, ${requestedIds.size} evidence request${requestedIds.size === 1 ? "" : "s"}, and ${risks.length} unresolved risk${risks.length === 1 ? "" : "s"}.`,
    decisions: input.decisions,
    submissions,
    evidenceRequested: EVIDENCE_CATALOG.filter((item) => requestedIds.has(item.id)),
    evidenceNotRequested: EVIDENCE_CATALOG.filter((item) => !requestedIds.has(item.id)),
    evidenceIgnored: EVIDENCE_CATALOG.filter((item) => ignoredIds.has(item.id)),
    evidenceRequestHistory: input.evidenceRequests,
    recommendationReview,
    submissionRecommendationReviews,
    institutionalMessages: input.institutionalMessages,
    consequences,
    counterfactuals: deriveCounterfactuals(input.decisions),
    unresolvedRisks: risks,
    advisorUsage: input.advisorTurns,
    facilitatorInjects: input.injects,
    timeline: [...input.timeline].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}
