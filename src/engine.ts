import { CASE_FACTS, EVIDENCE_CATALOG, FINAL_STAGE_INDEX, RECOMMENDATION_CLAIM_LABELS } from "./scenario";
import type {
  ActivityEvent,
  AdvisorTurn,
  AfterActionReport,
  Consequence,
  Counterfactual,
  DecisionState,
  EvidenceRequest,
  FrozenEvidenceAvailability,
  GlobalInject,
  InstitutionalMessage,
  NegotiationPreparationBrief,
  ParticipantDebrief,
  ParticipantProfile,
  RecommendationReview,
  ReplayProvenance,
  Submission,
  SubmissionContextSnapshot,
  SubmissionReplay,
  WorkshopSession,
} from "./types";

const PARTICIPANT_DEBRIEF_BOUNDARY = "This deterministic exercise reconstruction is fictional. It is not a real-world prediction, score, or competence finding.";
export const SCENARIO_VERSION = "kuvera-financing-assurances-2026-10-01";
export const CONSEQUENCE_RULE_VERSION = "kuvera-consequence-rules-2026-10-01";
export const SUBMISSION_CONTEXT_SCHEMA_VERSION = 1 as const;
export const SUBMISSION_CONTEXT_LIMITS = {
  availableEvidence: 32,
  facilitatorInjects: 100,
  answeredInstitutionalMessages: 100,
} as const;

const readinessLabels: Record<NonNullable<DecisionState["readiness"]>, string> = {
  READY: "Ready",
  READY_WITH_CONDITIONS: "Ready with conditions",
  NOT_READY: "Not ready",
};

const disclosureLabels: Record<NonNullable<DecisionState["disclosure"]>, string> = {
  FULL: "Full contract disclosure",
  REDACTED: "Redacted functional summary",
  WITHHOLD: "Withhold pending consent",
};

const perimeterLabels: Record<NonNullable<DecisionState["treatmentPerimeter"]>, string> = {
  BOTH_FACILITIES: "Facilities A and B included",
  FACILITY_A_ONLY: "Facility A included; Facility B deferred",
  DEFER: "Treatment perimeter deferred",
};

function asStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined;
}

function parseFrozenEvidence(value: unknown): FrozenEvidenceAvailability[] | undefined {
  if (!Array.isArray(value) || value.length > SUBMISSION_CONTEXT_LIMITS.availableEvidence) return undefined;
  const parsed = value.map((item) => {
    if (!item || typeof item !== "object") return undefined;
    const row = item as Record<string, unknown>;
    if (![row.requestId, row.evidenceId, row.requestedAt, row.availableAt].every((field) => typeof field === "string")) return undefined;
    if (row.releasedAt !== undefined && row.releasedAt !== null && typeof row.releasedAt !== "string") return undefined;
    return {
      requestId: row.requestId as string,
      evidenceId: row.evidenceId as string,
      requestedAt: row.requestedAt as string,
      availableAt: row.availableAt as string,
      ...(row.releasedAt ? { releasedAt: row.releasedAt as string } : {}),
    };
  });
  return parsed.every(Boolean) ? parsed as FrozenEvidenceAvailability[] : undefined;
}

export function parseSubmissionContextSnapshot(value: unknown): SubmissionContextSnapshot | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  const availableEvidence = parseFrozenEvidence(row.availableEvidence);
  const facilitatorInjectIds = asStringArray(row.facilitatorInjectIds);
  const answeredInstitutionalMessageIds = asStringArray(row.answeredInstitutionalMessageIds);
  if (
    row.schemaVersion !== SUBMISSION_CONTEXT_SCHEMA_VERSION
    || typeof row.scenarioVersion !== "string"
    || typeof row.consequenceRuleVersion !== "string"
    || !Number.isInteger(row.submissionVersion)
    || Number(row.submissionVersion) < 1
    || typeof row.submittedAt !== "string"
    || !row.decisions
    || typeof row.decisions !== "object"
    || !availableEvidence
    || !facilitatorInjectIds
    || facilitatorInjectIds.length > SUBMISSION_CONTEXT_LIMITS.facilitatorInjects
    || !answeredInstitutionalMessageIds
    || answeredInstitutionalMessageIds.length > SUBMISSION_CONTEXT_LIMITS.answeredInstitutionalMessages
  ) return undefined;
  return {
    schemaVersion: SUBMISSION_CONTEXT_SCHEMA_VERSION,
    scenarioVersion: String(row.scenarioVersion),
    consequenceRuleVersion: String(row.consequenceRuleVersion),
    submissionVersion: Number(row.submissionVersion),
    submittedAt: String(row.submittedAt),
    decisions: structuredClone(row.decisions as DecisionState),
    availableEvidence,
    facilitatorInjectIds,
    answeredInstitutionalMessageIds,
  };
}

export function buildSubmissionContextSnapshot(input: {
  participantId: string;
  sessionId: string;
  decisions: DecisionState;
  version: number;
  submittedAt: Date | string;
  evidenceRequests: EvidenceRequest[];
  injects: GlobalInject[];
  institutionalMessages: InstitutionalMessage[];
}): SubmissionContextSnapshot {
  const submittedAt = typeof input.submittedAt === "string" ? new Date(input.submittedAt) : input.submittedAt;
  if (!Number.isInteger(input.version) || input.version < 1 || Number.isNaN(submittedAt.getTime())) throw new Error("SUBMISSION_CONTEXT_INVALID");
  const availableEvidence = input.evidenceRequests
    .filter((request) => request.participantId === input.participantId
      && request.sessionId === input.sessionId
      && new Date(request.requestedAt).getTime() <= submittedAt.getTime()
      && evidenceIsAvailable(request, submittedAt))
    .sort((a, b) => a.evidenceId.localeCompare(b.evidenceId) || a.id.localeCompare(b.id))
    .map((request) => ({
      requestId: request.id,
      evidenceId: request.evidenceId,
      requestedAt: request.requestedAt,
      availableAt: request.availableAt,
      ...(request.releasedAt ? { releasedAt: request.releasedAt } : {}),
    }));
  const facilitatorInjectIds = input.injects
    .filter((inject) => inject.sessionId === input.sessionId && new Date(inject.sentAt).getTime() <= submittedAt.getTime())
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt) || a.id.localeCompare(b.id))
    .map((inject) => inject.id);
  const answeredInstitutionalMessageIds = input.institutionalMessages
    .filter((message) => message.participantId === input.participantId
      && message.sessionId === input.sessionId
      && message.status === "ANSWERED"
      && Boolean(message.answeredAt)
      && new Date(message.answeredAt!).getTime() <= submittedAt.getTime())
    .sort((a, b) => a.answeredAt!.localeCompare(b.answeredAt!) || a.id.localeCompare(b.id))
    .map((message) => message.id);
  if (
    availableEvidence.length > SUBMISSION_CONTEXT_LIMITS.availableEvidence
    || facilitatorInjectIds.length > SUBMISSION_CONTEXT_LIMITS.facilitatorInjects
    || answeredInstitutionalMessageIds.length > SUBMISSION_CONTEXT_LIMITS.answeredInstitutionalMessages
  ) throw new Error("SUBMISSION_CONTEXT_LIMIT_EXCEEDED");
  return {
    schemaVersion: SUBMISSION_CONTEXT_SCHEMA_VERSION,
    scenarioVersion: SCENARIO_VERSION,
    consequenceRuleVersion: CONSEQUENCE_RULE_VERSION,
    submissionVersion: input.version,
    submittedAt: submittedAt.toISOString(),
    decisions: structuredClone(input.decisions),
    availableEvidence,
    facilitatorInjectIds,
    answeredInstitutionalMessageIds,
  };
}

export function evidenceIsAvailable(request: EvidenceRequest, now = new Date()): boolean {
  const reviewTime = now.getTime();
  const releasedByReview = request.releasedAt !== undefined && new Date(request.releasedAt).getTime() <= reviewTime;
  return releasedByReview || new Date(request.availableAt).getTime() <= reviewTime;
}

export function beginDebriefSession(session: WorkshopSession, at: Date | string): WorkshopSession {
  const transitionTime = typeof at === "string" ? new Date(at) : at;
  const elapsed = session.status === "RUNNING" && session.clockStartedAt
    ? Math.floor((transitionTime.getTime() - new Date(session.clockStartedAt).getTime()) / 1000)
    : 0;
  const remainingSeconds = Math.max(0, session.remainingSeconds - Math.max(0, elapsed));
  const { clockStartedAt: _clockStartedAt, ...pausedSession } = session;
  return {
    ...pausedSession,
    status: "DEBRIEF",
    currentStage: FINAL_STAGE_INDEX,
    remainingSeconds,
    submissionsClosed: true,
  };
}

export function participantEntryStage(session: WorkshopSession, participant: ParticipantProfile): number {
  return session.status === "DEBRIEF" || session.status === "CLOSED"
    ? FINAL_STAGE_INDEX
    : Math.min(participant.currentStage, session.currentStage);
}

export function participantAvailableStage(
  session: WorkshopSession,
  participant: ParticipantProfile,
  hasSubmission: boolean,
): number {
  if (session.status === "DEBRIEF" || session.status === "CLOSED" || hasSubmission) return FINAL_STAGE_INDEX;
  return Math.max(session.currentStage, participant.currentStage);
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
      label: RECOMMENDATION_CLAIM_LABELS.LIQUIDITY_BASIS,
      recordedClaim: input.decisions.liquidityBasis === "UNRESOLVED" ? "Unresolved" : "Not recorded",
      status: "UNRESOLVED" as const,
      explanation: "The recommendation preserves that usable liquidity has not been established.",
      evidenceIds: [],
    };
    if (input.decisions.liquidityBasis === "REPORTED_780") return has("treasury-reconciliation") ? {
      claim: "LIQUIDITY_BASIS" as const,
      label: RECOMMENDATION_CLAIM_LABELS.LIQUIDITY_BASIS,
      recordedClaim: `USD ${CASE_FACTS.reportedLiquidityUsdMillions}m reported, not verified`,
      status: "UNSUPPORTED" as const,
      explanation: `The returned Treasury reconciliation establishes USD ${CASE_FACTS.usableLiquidityUsdMillions}m as usable liquidity; USD ${CASE_FACTS.reportedLiquidityUsdMillions}m remains only the gross reported balance.`,
      evidenceIds: ["treasury-reconciliation"],
    } : {
      claim: "LIQUIDITY_BASIS" as const,
      label: RECOMMENDATION_CLAIM_LABELS.LIQUIDITY_BASIS,
      recordedClaim: `USD ${CASE_FACTS.reportedLiquidityUsdMillions}m reported, not verified`,
      status: "SUPPORTED" as const,
      explanation: `The shared case record supports USD ${CASE_FACTS.reportedLiquidityUsdMillions}m only as a reported, provisional figure.`,
      evidenceIds: [],
    };
    return has("treasury-reconciliation") ? {
      claim: "LIQUIDITY_BASIS" as const,
      label: RECOMMENDATION_CLAIM_LABELS.LIQUIDITY_BASIS,
      recordedClaim: `USD ${CASE_FACTS.usableLiquidityUsdMillions}m verified usable`,
      status: "SUPPORTED" as const,
      explanation: `The returned Treasury reconciliation establishes the USD ${CASE_FACTS.usableLiquidityUsdMillions}m usable-liquidity basis.`,
      evidenceIds: ["treasury-reconciliation"],
    } : {
      claim: "LIQUIDITY_BASIS" as const,
      label: RECOMMENDATION_CLAIM_LABELS.LIQUIDITY_BASIS,
      recordedClaim: `USD ${CASE_FACTS.usableLiquidityUsdMillions}m verified usable`,
      status: "UNSUPPORTED" as const,
      explanation: `The Treasury cash reconciliation has not returned, so USD ${CASE_FACTS.usableLiquidityUsdMillions}m is not established in the available record.`,
      evidenceIds: [],
    };
  })();

  const account = (() => {
    if (!input.decisions.accountClassification || input.decisions.accountClassification === "UNRESOLVED") return {
      claim: "ACCOUNT_CLASSIFICATION" as const,
      label: RECOMMENDATION_CLAIM_LABELS.ACCOUNT_CLASSIFICATION,
      recordedClaim: input.decisions.accountClassification === "UNRESOLVED" ? "Unresolved" : "Not recorded",
      status: "UNRESOLVED" as const,
      explanation: "The recommendation preserves that the account-control classification is not established.",
      evidenceIds: [],
    };
    if (input.decisions.accountClassification === "EFFECTIVE_CONTROL") {
      if (has("account-control")) return {
        claim: "ACCOUNT_CLASSIFICATION" as const,
        label: RECOMMENDATION_CLAIM_LABELS.ACCOUNT_CLASSIFICATION,
        recordedClaim: "Quasi-collateral / effective control",
        status: "SUPPORTED" as const,
        explanation: "The returned account-control terms establish consent and payment-sweep constraints.",
        evidenceIds: ["account-control"],
      };
      if (has("facility-a")) return {
        claim: "ACCOUNT_CLASSIFICATION" as const,
        label: RECOMMENDATION_CLAIM_LABELS.ACCOUNT_CLASSIFICATION,
        recordedClaim: "Quasi-collateral / effective control",
        status: "CONDITIONAL" as const,
        explanation: "Facility A confirms an account waterfall, but the withdrawal and control terms remain open.",
        evidenceIds: ["facility-a"],
      };
      return {
        claim: "ACCOUNT_CLASSIFICATION" as const,
        label: RECOMMENDATION_CLAIM_LABELS.ACCOUNT_CLASSIFICATION,
        recordedClaim: "Quasi-collateral / effective control",
        status: "UNSUPPORTED" as const,
        explanation: "The restricted-account control terms have not returned, so effective control is not established.",
        evidenceIds: [],
      };
    }
    return {
      claim: "ACCOUNT_CLASSIFICATION" as const,
      label: RECOMMENDATION_CLAIM_LABELS.ACCOUNT_CLASSIFICATION,
      recordedClaim: "Ordinary operating account",
      status: "UNSUPPORTED" as const,
      explanation: has("account-control")
        ? "The returned account-control terms conflict with an ordinary-account classification."
        : `The available record does not establish that ${CASE_FACTS.facilityAAccount} is an ordinary operating account.`,
      evidenceIds: has("account-control") ? ["account-control"] : [],
    };
  })();

  const facilityLinkage = (() => {
    if (!input.decisions.facilityLinkage || input.decisions.facilityLinkage === "UNRESOLVED") return {
      claim: "FACILITY_LINKAGE" as const,
      label: RECOMMENDATION_CLAIM_LABELS.FACILITY_LINKAGE,
      recordedClaim: input.decisions.facilityLinkage === "UNRESOLVED" ? "Unresolved" : "Not recorded",
      status: "UNRESOLVED" as const,
      explanation: `The recommendation preserves that Facility B's relationship to ${CASE_FACTS.facilityAAccount} is ${CASE_FACTS.facilityBEntryStatus}.`,
      evidenceIds: [],
    };
    if (input.decisions.facilityLinkage === CASE_FACTS.facilityLinkageFinding) {
      if (linkageEvidence.length) return {
        claim: "FACILITY_LINKAGE" as const,
        label: RECOMMENDATION_CLAIM_LABELS.FACILITY_LINKAGE,
        recordedClaim: "Shared revenue pool",
        status: "SUPPORTED" as const,
        explanation: `Returned Facility B or dependency evidence establishes the shared ${CASE_FACTS.facilityAAccount} revenue pool.`,
        evidenceIds: linkageEvidence,
      };
      if (has("facility-a")) return {
        claim: "FACILITY_LINKAGE" as const,
        label: RECOMMENDATION_CLAIM_LABELS.FACILITY_LINKAGE,
        recordedClaim: "Shared revenue pool",
        status: "CONDITIONAL" as const,
        explanation: `Facility A's ${CASE_FACTS.facilityAAccount} link is available, but Facility B or dependency evidence has not returned.`,
        evidenceIds: ["facility-a"],
      };
      return {
        claim: "FACILITY_LINKAGE" as const,
        label: RECOMMENDATION_CLAIM_LABELS.FACILITY_LINKAGE,
        recordedClaim: "Shared revenue pool",
        status: "UNSUPPORTED" as const,
        explanation: "Facility B or dependency evidence has not returned, so a shared pool is not established.",
        evidenceIds: [],
      };
    }
    return {
      claim: "FACILITY_LINKAGE" as const,
      label: RECOMMENDATION_CLAIM_LABELS.FACILITY_LINKAGE,
      recordedClaim: "Independent facilities",
      status: "UNSUPPORTED" as const,
      explanation: linkageEvidence.length
        ? "Returned Facility B or dependency evidence conflicts with treating the facilities as independent."
        : `The available record does not establish that Facility B is independent of ${CASE_FACTS.facilityAAccount}.`,
      evidenceIds: linkageEvidence,
    };
  })();

  const disclosure = (() => {
    if (!input.decisions.disclosure) return {
      claim: "DISCLOSURE_RECOMMENDATION" as const,
      label: RECOMMENDATION_CLAIM_LABELS.DISCLOSURE_RECOMMENDATION,
      recordedClaim: "Not recorded",
      status: "UNRESOLVED" as const,
      explanation: "No disclosure recommendation has been recorded.",
      evidenceIds: [],
    };
    if (input.decisions.disclosure === "REDACTED") return has("confidentiality-opinion") ? {
      claim: "DISCLOSURE_RECOMMENDATION" as const,
      label: RECOMMENDATION_CLAIM_LABELS.DISCLOSURE_RECOMMENDATION,
      recordedClaim: "Redacted functional summary",
      status: "SUPPORTED" as const,
      explanation: "The returned legal opinion permits a redacted functional summary.",
      evidenceIds: ["confidentiality-opinion"],
    } : {
      claim: "DISCLOSURE_RECOMMENDATION" as const,
      label: RECOMMENDATION_CLAIM_LABELS.DISCLOSURE_RECOMMENDATION,
      recordedClaim: "Redacted functional summary",
      status: "CONDITIONAL" as const,
      explanation: "A functional summary may meet the information need, but the legal confidentiality opinion has not returned.",
      evidenceIds: [],
    };
    if (input.decisions.disclosure === "FULL") return {
      claim: "DISCLOSURE_RECOMMENDATION" as const,
      label: RECOMMENDATION_CLAIM_LABELS.DISCLOSURE_RECOMMENDATION,
      recordedClaim: "Full contract disclosure",
      status: "UNSUPPORTED" as const,
      explanation: has("confidentiality-opinion")
        ? "The returned legal opinion requires consent for full contract text, and no consent evidence is available."
        : "The legal confidentiality opinion and any consent for full contract text are not available.",
      evidenceIds: has("confidentiality-opinion") ? ["confidentiality-opinion"] : [],
    };
    return {
      claim: "DISCLOSURE_RECOMMENDATION" as const,
      label: RECOMMENDATION_CLAIM_LABELS.DISCLOSURE_RECOMMENDATION,
      recordedClaim: "Withhold pending consent",
      status: "SUPPORTED" as const,
      explanation: "The available record does not establish permission for unrestricted disclosure, and the recommendation preserves that dependency.",
      evidenceIds: has("confidentiality-opinion") ? ["confidentiality-opinion"] : [],
    };
  })();

  const treatment = (() => {
    if (!input.decisions.treatmentPerimeter || input.decisions.treatmentPerimeter === "DEFER") return {
      claim: "TREATMENT_PERIMETER" as const,
      label: RECOMMENDATION_CLAIM_LABELS.TREATMENT_PERIMETER,
      recordedClaim: input.decisions.treatmentPerimeter === "DEFER" ? "Deferred" : "Not recorded",
      status: "UNRESOLVED" as const,
      explanation: "The recommendation preserves that the evidence does not yet define the treatment perimeter.",
      evidenceIds: [],
    };
    if (input.decisions.treatmentPerimeter === "BOTH_FACILITIES") {
      if (linkageEvidence.length) return {
        claim: "TREATMENT_PERIMETER" as const,
        label: RECOMMENDATION_CLAIM_LABELS.TREATMENT_PERIMETER,
        recordedClaim: "Facilities A and B",
        status: "SUPPORTED" as const,
        explanation: "Returned Facility B or dependency evidence supports carrying both facilities in the dependency analysis.",
        evidenceIds: linkageEvidence,
      };
      if (has("facility-a")) return {
        claim: "TREATMENT_PERIMETER" as const,
        label: RECOMMENDATION_CLAIM_LABELS.TREATMENT_PERIMETER,
        recordedClaim: "Facilities A and B",
        status: "CONDITIONAL" as const,
        explanation: `Facility A's ${CASE_FACTS.facilityAAccount} link is available, but Facility B's dependency remains open.`,
        evidenceIds: ["facility-a"],
      };
      return {
        claim: "TREATMENT_PERIMETER" as const,
        label: RECOMMENDATION_CLAIM_LABELS.TREATMENT_PERIMETER,
        recordedClaim: "Facilities A and B",
        status: "UNSUPPORTED" as const,
        explanation: "Facility B or dependency evidence has not returned to support carrying both facilities.",
        evidenceIds: [],
      };
    }
    if (linkageEvidence.length) return {
      claim: "TREATMENT_PERIMETER" as const,
      label: RECOMMENDATION_CLAIM_LABELS.TREATMENT_PERIMETER,
      recordedClaim: "Facility A only",
      status: "UNSUPPORTED" as const,
      explanation: "Returned Facility B or dependency evidence conflicts with excluding Facility B from the dependency analysis.",
      evidenceIds: linkageEvidence,
    };
    return has("facility-a") ? {
      claim: "TREATMENT_PERIMETER" as const,
      label: RECOMMENDATION_CLAIM_LABELS.TREATMENT_PERIMETER,
      recordedClaim: "Facility A only",
      status: "CONDITIONAL" as const,
      explanation: `Facility A is established, but Facility B's relationship to ${CASE_FACTS.facilityAAccount} remains open.`,
      evidenceIds: ["facility-a"],
    } : {
      claim: "TREATMENT_PERIMETER" as const,
      label: RECOMMENDATION_CLAIM_LABELS.TREATMENT_PERIMETER,
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
      label: RECOMMENDATION_CLAIM_LABELS.READINESS_POSITION,
      recordedClaim: "Not recorded",
      status: "UNRESOLVED" as const,
      explanation: "No readiness position has been recorded.",
      evidenceIds: [],
    };
    if (input.decisions.readiness === "NOT_READY") return materialItems.some((item) => item.status !== "SUPPORTED") ? {
      claim: "READINESS_POSITION" as const,
      label: RECOMMENDATION_CLAIM_LABELS.READINESS_POSITION,
      recordedClaim: "Not ready",
      status: "SUPPORTED" as const,
      explanation: "The not-ready posture is consistent with the open or unsupported material claims in this review.",
      evidenceIds: [],
    } : {
      claim: "READINESS_POSITION" as const,
      label: RECOMMENDATION_CLAIM_LABELS.READINESS_POSITION,
      recordedClaim: "Not ready",
      status: "CONDITIONAL" as const,
      explanation: "All reviewed material claims are supported; name any separate dependency keeping the package not ready.",
      evidenceIds: [],
    };
    if (input.decisions.readiness === "READY_WITH_CONDITIONS") return unsupported.length ? {
      claim: "READINESS_POSITION" as const,
      label: RECOMMENDATION_CLAIM_LABELS.READINESS_POSITION,
      recordedClaim: "Ready with conditions",
      status: "UNSUPPORTED" as const,
      explanation: `A condition does not support firm claims that exceed or conflict with the evidence: ${unsupportedLabels}.`,
      evidenceIds: [],
    } : {
      claim: "READINESS_POSITION" as const,
      label: RECOMMENDATION_CLAIM_LABELS.READINESS_POSITION,
      recordedClaim: "Ready with conditions",
      status: "SUPPORTED" as const,
      explanation: open.length
        ? "The conditional posture is consistent with the named open evidence dependencies."
        : "The reviewed material claims are supported, and the posture retains any separately recorded conditions.",
      evidenceIds: [],
    };
    if (unsupported.length) return {
      claim: "READINESS_POSITION" as const,
      label: RECOMMENDATION_CLAIM_LABELS.READINESS_POSITION,
      recordedClaim: "Ready",
      status: "UNSUPPORTED" as const,
      explanation: `The ready posture exceeds material claims that are unsupported by the available evidence: ${unsupportedLabels}.`,
      evidenceIds: [],
    };
    if (open.length) return {
      claim: "READINESS_POSITION" as const,
      label: RECOMMENDATION_CLAIM_LABELS.READINESS_POSITION,
      recordedClaim: "Ready",
      status: "CONDITIONAL" as const,
      explanation: `Readiness is not yet unconditional because these material dependencies remain open: ${openLabels}.`,
      evidenceIds: [],
    };
    return {
      claim: "READINESS_POSITION" as const,
      label: RECOMMENDATION_CLAIM_LABELS.READINESS_POSITION,
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

export function buildNegotiationPreparationBrief(input: {
  decisions: DecisionState;
  evidenceRequests: EvidenceRequest[];
  institutionalMessages?: InstitutionalMessage[];
  preparedAt: Date | string;
  recommendationReview?: RecommendationReview;
}): NegotiationPreparationBrief {
  const preparedAt = typeof input.preparedAt === "string" ? new Date(input.preparedAt) : input.preparedAt;
  const availableIds = new Set(input.evidenceRequests
    .filter((request) => evidenceIsAvailable(request, preparedAt))
    .map((request) => request.evidenceId));
  const review = input.recommendationReview ?? reviewRecommendation({
    decisions: input.decisions,
    evidenceRequests: input.evidenceRequests,
    reviewedAt: preparedAt,
  });
  const disclosure = input.decisions.disclosure ? disclosureLabels[input.decisions.disclosure] : "Not recorded";
  const perimeter = input.decisions.treatmentPerimeter ? perimeterLabels[input.decisions.treatmentPerimeter] : "Not recorded";
  const institutionalEvidence = (input.institutionalMessages ?? [])
    .filter((message) => message.status === "ANSWERED" && message.reply && message.answeredAt && new Date(message.answeredAt).getTime() <= preparedAt.getTime())
    .map((message) => ({
      id: `institutional-message-${message.id}`,
      title: `${message.institution.replaceAll("_", " ").toLowerCase()} reply`,
      summary: message.reply!,
      sourceLabel: "Facilitator-authorized institutional reply · case record",
    }));
  return {
    preparedAt: preparedAt.toISOString(),
    position: input.decisions.readiness ? readinessLabels[input.decisions.readiness] : "Not recorded",
    evidenceBasis: EVIDENCE_CATALOG
      .filter((item) => availableIds.has(item.id))
      .map(({ id, title, details, sourceLabel }) => ({ id, title, summary: details, sourceLabel }))
      .concat(institutionalEvidence),
    knownUncertainties: review.items
      .filter((item) => item.status !== "SUPPORTED")
      .map((item) => `${item.label}: ${item.explanation}`),
    disclosureBoundary: input.decisions.disclosureRationale.trim()
      ? `${disclosure}. ${input.decisions.disclosureRationale.trim()}`
      : disclosure,
    treatmentPerimeter: perimeter,
    conditionsToAdvance: input.decisions.unresolvedRisks.trim() || "No additional conditions recorded.",
    nextInstitutionalHandoff: input.decisions.nextHandoff.trim() || "Not recorded",
    financeMinistryRecommendation: input.decisions.finalRationale.trim() || "Not recorded",
  };
}

export function negotiationBriefIsSubmittable(decisions: DecisionState): boolean {
  return Boolean(decisions.readiness && decisions.finalRationale.trim() && decisions.nextHandoff.trim());
}

function frozenSnapshotFor(submission: Submission): SubmissionContextSnapshot | undefined {
  const snapshot = submission.contextSnapshot;
  return snapshot
    && snapshot.submissionVersion === submission.version
    && new Date(snapshot.submittedAt).getTime() === new Date(submission.submittedAt).getTime()
    ? snapshot
    : undefined;
}

function frozenEvidenceRequests(submission: Submission, snapshot: SubmissionContextSnapshot): EvidenceRequest[] {
  return snapshot.availableEvidence.map((item) => ({
    id: item.requestId,
    sessionId: submission.sessionId,
    participantId: submission.participantId,
    evidenceId: item.evidenceId,
    requestedAt: item.requestedAt,
    availableAt: item.availableAt,
    ...(item.releasedAt ? { releasedAt: item.releasedAt } : {}),
  }));
}

function replayProvenance(submission?: Submission): ReplayProvenance {
  if (!submission) return {
    mode: "WORKING_STATE",
    label: "working state · not a submitted replay",
    scenarioVersion: SCENARIO_VERSION,
    consequenceRuleVersion: CONSEQUENCE_RULE_VERSION,
  };
  const snapshot = frozenSnapshotFor(submission);
  if (!snapshot) return {
    mode: "LEGACY_CURRENT_RULE_RECONSTRUCTION",
    label: "legacy · current-rule reconstruction",
    scenarioVersion: SCENARIO_VERSION,
    consequenceRuleVersion: CONSEQUENCE_RULE_VERSION,
    submissionVersion: submission.version,
    submittedAt: submission.submittedAt,
  };
  return {
    mode: "FROZEN",
    label: `frozen submission context · scenario ${snapshot.scenarioVersion} · consequence rules ${snapshot.consequenceRuleVersion}`,
    scenarioVersion: snapshot.scenarioVersion,
    consequenceRuleVersion: snapshot.consequenceRuleVersion,
    submissionVersion: submission.version,
    submittedAt: submission.submittedAt,
  };
}

export function buildSubmissionReplay(input: {
  submission: Submission;
  evidenceRequests: EvidenceRequest[];
  institutionalMessages: InstitutionalMessage[];
  injects: GlobalInject[];
}): SubmissionReplay {
  const snapshot = frozenSnapshotFor(input.submission);
  const submittedAt = input.submission.submittedAt;
  const decisions = structuredClone(snapshot?.decisions ?? input.submission.decisions);
  const evidenceRequests = snapshot
    ? frozenEvidenceRequests(input.submission, snapshot)
    : input.evidenceRequests.filter((request) => request.participantId === input.submission.participantId
      && request.sessionId === input.submission.sessionId
      && new Date(request.requestedAt).getTime() <= new Date(submittedAt).getTime()
      && evidenceIsAvailable(request, new Date(submittedAt)));
  const messageIds = snapshot ? new Set(snapshot.answeredInstitutionalMessageIds) : undefined;
  const institutionalMessages = input.institutionalMessages
    .filter((message) => message.participantId === input.submission.participantId
      && message.sessionId === input.submission.sessionId
      && message.status === "ANSWERED"
      && Boolean(message.answeredAt)
      && (messageIds ? messageIds.has(message.id) : new Date(message.answeredAt!).getTime() <= new Date(submittedAt).getTime()))
    .sort((a, b) => a.answeredAt!.localeCompare(b.answeredAt!) || a.id.localeCompare(b.id));
  const injectIds = snapshot ? new Set(snapshot.facilitatorInjectIds) : undefined;
  const facilitatorInjects = input.injects
    .filter((inject) => inject.sessionId === input.submission.sessionId
      && (injectIds ? injectIds.has(inject.id) : new Date(inject.sentAt).getTime() <= new Date(submittedAt).getTime()))
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt) || a.id.localeCompare(b.id));
  const review = reviewRecommendationForVersion(snapshot?.consequenceRuleVersion, { decisions, evidenceRequests, reviewedAt: submittedAt });
  const brief = buildNegotiationPreparationBrief({ decisions, evidenceRequests, institutionalMessages, preparedAt: submittedAt, recommendationReview: review });
  return {
    submissionId: input.submission.id,
    version: input.submission.version,
    submittedAt,
    decisions,
    evidenceAvailable: brief.evidenceBasis,
    recommendationReview: review,
    negotiationPreparationBrief: brief,
    consequences: deriveConsequencesForVersion(snapshot?.consequenceRuleVersion, decisions),
    counterfactuals: deriveCounterfactualsForVersion(snapshot?.consequenceRuleVersion, decisions),
    unresolvedRisks: unresolvedRiskListForVersion(snapshot?.consequenceRuleVersion, decisions),
    institutionalMessages,
    facilitatorInjects,
    replayProvenance: replayProvenance(input.submission),
  };
}

export function buildParticipantDebrief(input: {
  participantId: string;
  submissions: Submission[];
  evidenceRequests: EvidenceRequest[];
  institutionalMessages?: InstitutionalMessage[];
  injects: GlobalInject[];
  submissionVersion?: number;
}): ParticipantDebrief | undefined {
  const participantSubmissions = input.submissions
    .filter((item) => item.participantId === input.participantId)
    .sort((a, b) => a.version - b.version);
  const submission = input.submissionVersion === undefined
    ? participantSubmissions.at(-1)
    : participantSubmissions.find((item) => item.version === input.submissionVersion);
  if (!submission) return undefined;
  const replay = buildSubmissionReplay({
    submission,
    evidenceRequests: input.evidenceRequests,
    institutionalMessages: input.institutionalMessages ?? [],
    injects: input.injects,
  });

  return {
    submissionId: submission.id,
    version: submission.version,
    submittedAt: submission.submittedAt,
    position: replay.negotiationPreparationBrief.position,
    evidenceAvailable: replay.evidenceAvailable,
    consequences: replay.consequences,
    unresolvedRisks: replay.unresolvedRisks,
    counterfactual: replay.counterfactuals[0]!,
    facilitatorInjects: replay.facilitatorInjects,
    replayProvenance: replay.replayProvenance,
    fictionalBoundary: PARTICIPANT_DEBRIEF_BOUNDARY,
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
      outcome: `Coordination began earlier, but the OCC could not treat USD ${CASE_FACTS.reportedLiquidityUsdMillions}m as usable cash and requested clarification.`,
      basis: "Authored consequence rule: a caveat preserves uncertainty; it does not verify the figure.",
      severity: "CAUTION",
    });
  }

  if (decisions.liquidityBasis === "VERIFIED_480") {
    consequences.push({
      id: "verified-basis",
      title: `Usable liquidity was corrected to USD ${CASE_FACTS.usableLiquidityUsdMillions}m`,
      outcome: `The package uses USD ${CASE_FACTS.usableLiquidityUsdMillions}m as the verified usable-liquidity basis after distinguishing USD ${CASE_FACTS.restrictedLiquidityUsdMillions}m restricted and USD ${CASE_FACTS.protectedLiquidityUsdMillions}m protected from the USD ${CASE_FACTS.reportedLiquidityUsdMillions}m reported balance.`,
      basis: `Deterministic reconciliation: ${CASE_FACTS.reportedLiquidityUsdMillions} - ${CASE_FACTS.restrictedLiquidityUsdMillions} - ${CASE_FACTS.protectedLiquidityUsdMillions} = ${CASE_FACTS.usableLiquidityUsdMillions}.`,
      severity: "POSITIVE",
    });
  } else {
    consequences.push({
      id: "unreconciled-basis",
      title: "Liquidity remained provisional",
      outcome: `The package cannot rely on the gross USD ${CASE_FACTS.reportedLiquidityUsdMillions}m figure as freely usable resources.`,
      basis: "The restricted and protected balances were not incorporated into the submitted basis.",
      severity: "BLOCKING",
    });
  }

  if (decisions.facilityLinkage === CASE_FACTS.facilityLinkageFinding) {
    consequences.push({
      id: "shared-pool",
      title: "The treatment perimeter reflects the shared revenue pool",
      outcome: "Facilities A and B are carried as linked for dependency analysis, without claiming that they are legally identical.",
      basis: `Scenario fact: both facilities depend on ${CASE_FACTS.facilityAAccount}.`,
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
      projectedDifference: `The initial package would arrive later but would use USD ${CASE_FACTS.usableLiquidityUsdMillions}m as the supported usable-liquidity basis.`,
      fixedAssumptions: "Account terms, balances, deadlines, and all later scenario rules remain unchanged.",
    });
  } else {
    items.push({
      id: "defer-verification",
      alternative: `Proceed immediately with the USD ${CASE_FACTS.reportedLiquidityUsdMillions}m report under an explicit caveat.`,
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
  if (decisions.facilityLinkage !== CASE_FACTS.facilityLinkageFinding) {
    items.push({
      id: "map-shared-pool",
      alternative: "Carry both facilities inside the dependency analysis.",
      projectedDifference: `The treatment perimeter would align with the authored ${CASE_FACTS.facilityAAccount} dependency and avoid treating Facility B as operationally independent.`,
      fixedAssumptions: "This changes dependency treatment, not the legal character of either facility.",
    });
  }
  return items;
}

function deriveConsequencesForVersion(ruleVersion: string | undefined, decisions: DecisionState): Consequence[] {
  if (!ruleVersion || ruleVersion === CONSEQUENCE_RULE_VERSION) return deriveConsequences(decisions);
  return [{
    id: "archived-rule-version-unavailable",
    title: "Archived consequence rules are unavailable in this client",
    outcome: `This frozen submission names ${ruleVersion}; this client will not reinterpret it with ${CONSEQUENCE_RULE_VERSION}.`,
    basis: "Replay fails closed when its recorded deterministic rule version is unavailable.",
    severity: "NEUTRAL",
  }];
}

function deriveCounterfactualsForVersion(ruleVersion: string | undefined, decisions: DecisionState): Counterfactual[] {
  if (!ruleVersion || ruleVersion === CONSEQUENCE_RULE_VERSION) return deriveCounterfactuals(decisions);
  return [{
    id: "archived-rule-version-unavailable",
    alternative: "Load a client that contains the archived consequence-rule version.",
    projectedDifference: "No counterfactual is generated by a different rule version.",
    fixedAssumptions: `The frozen decisions and ${ruleVersion} rule-version boundary remain unchanged.`,
  }];
}

function reviewRecommendationForVersion(
  ruleVersion: string | undefined,
  input: Parameters<typeof reviewRecommendation>[0],
): RecommendationReview {
  if (!ruleVersion || ruleVersion === CONSEQUENCE_RULE_VERSION) return reviewRecommendation(input);
  const reviewedAt = typeof input.reviewedAt === "string" ? new Date(input.reviewedAt) : input.reviewedAt;
  const labels = [
    ["LIQUIDITY_BASIS", "Liquidity basis"],
    ["ACCOUNT_CLASSIFICATION", "Account classification"],
    ["FACILITY_LINKAGE", "Facility A/B linkage"],
    ["DISCLOSURE_RECOMMENDATION", "Disclosure recommendation"],
    ["TREATMENT_PERIMETER", "Treatment perimeter"],
    ["READINESS_POSITION", "Readiness position"],
  ] as const;
  return {
    reviewedAt: reviewedAt.toISOString(),
    items: labels.map(([claim, label]) => ({
      claim,
      label,
      recordedClaim: "Frozen claim retained",
      status: "UNRESOLVED" as const,
      explanation: `The archived review rules ${ruleVersion} are not available in this client; the claim has not been reinterpreted with current rules.`,
      evidenceIds: [],
    })),
    readyMismatch: false,
    submissionAllowed: true,
  };
}

function unresolvedRiskListForVersion(ruleVersion: string | undefined, decisions: DecisionState): string[] {
  if (!ruleVersion || ruleVersion === CONSEQUENCE_RULE_VERSION) return unresolvedRiskList(decisions);
  return [`Archived consequence rules ${ruleVersion} are unavailable; current rules were not used to reinterpret unresolved risks.`];
}

export function unresolvedRiskList(decisions: DecisionState): string[] {
  const risks: string[] = [];
  if (decisions.liquidityBasis !== "VERIFIED_480") risks.push(`Usable liquidity is not verified at USD ${CASE_FACTS.usableLiquidityUsdMillions}m.`);
  if (decisions.accountClassification === "UNRESOLVED" || !decisions.accountClassification) risks.push("Account-control classification remains unresolved.");
  if (decisions.facilityLinkage !== CASE_FACTS.facilityLinkageFinding) risks.push("The shared Facility A/B revenue-pool dependency is not incorporated.");
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
  submissionVersion?: number;
}): AfterActionReport {
  const submissions = input.submissions
    .filter((submission) => submission.participantId === input.participant.id && submission.sessionId === input.session.id)
    .sort((a, b) => a.version - b.version);
  const evidenceRequestHistory = input.evidenceRequests.filter((request) => (
    request.participantId === input.participant.id && request.sessionId === input.session.id
  ));
  const institutionalMessageHistory = input.institutionalMessages.filter((message) => (
    message.participantId === input.participant.id && message.sessionId === input.session.id
  ));
  const facilitatorInjectHistory = input.injects.filter((inject) => inject.sessionId === input.session.id);
  const generatedAt = new Date().toISOString();
  const submissionReplays = submissions.map((submission) => buildSubmissionReplay({
    submission,
    evidenceRequests: evidenceRequestHistory,
    institutionalMessages: institutionalMessageHistory,
    injects: facilitatorInjectHistory,
  }));
  const selectedReplay = input.submissionVersion === undefined
    ? submissionReplays.at(-1)
    : submissionReplays.find((replay) => replay.version === input.submissionVersion);
  const briefDecisions = selectedReplay?.decisions ?? structuredClone(input.decisions);
  const requestedAtSelection = selectedReplay?.submittedAt ?? generatedAt;
  const selectedEvidenceRequests = evidenceRequestHistory.filter((request) => (
    new Date(request.requestedAt).getTime() <= new Date(requestedAtSelection).getTime()
  ));
  const requestedIds = new Set(selectedEvidenceRequests.map((request) => request.evidenceId));
  const recommendationReview = selectedReplay?.recommendationReview ?? reviewRecommendation({
    decisions: briefDecisions,
    evidenceRequests: selectedEvidenceRequests,
    reviewedAt: generatedAt,
  });
  const negotiationPreparationBrief = selectedReplay?.negotiationPreparationBrief ?? buildNegotiationPreparationBrief({
    decisions: briefDecisions,
    evidenceRequests: selectedEvidenceRequests,
    institutionalMessages: institutionalMessageHistory,
    preparedAt: generatedAt,
  });
  const submissionRecommendationReviews = submissionReplays.map((replay) => ({
    submissionId: replay.submissionId,
    version: replay.version,
    review: replay.recommendationReview,
  }));
  const submissionBriefs = submissionReplays.map((replay) => ({
    submissionId: replay.submissionId,
    version: replay.version,
    brief: replay.negotiationPreparationBrief,
  }));
  const ignoredIds = new Set(recommendationReview.items
    .filter((item) => item.status === "UNSUPPORTED")
    .flatMap((item) => item.evidenceIds));
  const consequences = selectedReplay?.consequences ?? deriveConsequences(briefDecisions);
  const risks = selectedReplay?.unresolvedRisks ?? unresolvedRiskList(briefDecisions);
  const readiness = briefDecisions.readiness?.replaceAll("_", " ").toLowerCase() ?? "not submitted";
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
    executiveSummary: selectedReplay
      ? `${input.participant.name}'s version ${selectedReplay.version} is a ${readiness} internal Debt Management Office negotiation-preparation brief. The record contains ${submissions.length} submission version${submissions.length === 1 ? "" : "s"}, ${requestedIds.size} evidence request${requestedIds.size === 1 ? "" : "s"} by that submission, and ${risks.length} unresolved risk${risks.length === 1 ? "" : "s"}.`
      : `${input.participant.name} has no submitted replay. This report shows working state and does not claim an exact historical reconstruction.`,
    decisions: briefDecisions,
    transferReflection: input.decisions.reflection,
    ...(selectedReplay ? { selectedSubmissionVersion: selectedReplay.version } : {}),
    replayProvenance: selectedReplay?.replayProvenance ?? replayProvenance(),
    submissions,
    submissionReplays,
    evidenceRequested: EVIDENCE_CATALOG.filter((item) => requestedIds.has(item.id)),
    evidenceNotRequested: EVIDENCE_CATALOG.filter((item) => !requestedIds.has(item.id)),
    evidenceIgnored: EVIDENCE_CATALOG.filter((item) => ignoredIds.has(item.id)),
    evidenceRequestHistory,
    recommendationReview,
    submissionRecommendationReviews,
    negotiationPreparationBrief,
    submissionBriefs,
    institutionalMessages: selectedReplay?.institutionalMessages ?? institutionalMessageHistory,
    consequences,
    counterfactuals: selectedReplay?.counterfactuals ?? deriveCounterfactuals(briefDecisions),
    unresolvedRisks: risks,
    advisorUsage: input.advisorTurns.filter((turn) => turn.participantId === input.participant.id && turn.sessionId === input.session.id),
    facilitatorInjects: selectedReplay?.facilitatorInjects ?? facilitatorInjectHistory,
    timeline: input.timeline
      .filter((event) => event.sessionId === input.session.id && (event.participantId === undefined || event.participantId === input.participant.id))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

export function selectAfterActionReportSubmission(report: AfterActionReport, version: number): AfterActionReport {
  const replay = report.submissionReplays.find((item) => item.version === version);
  if (!replay) return report;
  const requestedIds = new Set(report.evidenceRequestHistory
    .filter((request) => new Date(request.requestedAt).getTime() <= new Date(replay.submittedAt).getTime())
    .map((request) => request.evidenceId));
  const ignoredIds = new Set(replay.recommendationReview.items
    .filter((item) => item.status === "UNSUPPORTED")
    .flatMap((item) => item.evidenceIds));
  const readiness = replay.decisions.readiness?.replaceAll("_", " ").toLowerCase() ?? "not submitted";
  return {
    ...report,
    executiveSummary: `${report.participant.name}'s version ${replay.version} is a ${readiness} internal Debt Management Office negotiation-preparation brief. The record contains ${report.submissions.length} submission version${report.submissions.length === 1 ? "" : "s"}, ${requestedIds.size} evidence request${requestedIds.size === 1 ? "" : "s"} by that submission, and ${replay.unresolvedRisks.length} unresolved risk${replay.unresolvedRisks.length === 1 ? "" : "s"}.`,
    decisions: structuredClone(replay.decisions),
    selectedSubmissionVersion: replay.version,
    replayProvenance: replay.replayProvenance,
    evidenceRequested: EVIDENCE_CATALOG.filter((item) => requestedIds.has(item.id)),
    evidenceNotRequested: EVIDENCE_CATALOG.filter((item) => !requestedIds.has(item.id)),
    evidenceIgnored: EVIDENCE_CATALOG.filter((item) => ignoredIds.has(item.id)),
    recommendationReview: replay.recommendationReview,
    negotiationPreparationBrief: replay.negotiationPreparationBrief,
    institutionalMessages: replay.institutionalMessages,
    consequences: replay.consequences,
    counterfactuals: replay.counterfactuals,
    unresolvedRisks: replay.unresolvedRisks,
    facilitatorInjects: replay.facilitatorInjects,
  };
}
