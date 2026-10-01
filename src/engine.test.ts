import { describe, expect, it, vi } from "vitest";
import { saveTransferReflection, submitRecommendation, type ParticipantBundle } from "./data";
import { beginDebriefSession, buildAfterActionReport, buildNegotiationPreparationBrief, buildParticipantDebrief, buildSubmissionContextSnapshot, buildSubmissionReplay, CONSEQUENCE_RULE_VERSION, deriveConsequences, deriveCounterfactuals, negotiationBriefIsSubmittable, participantAvailableStage, participantEntryStage, reviewRecommendation, SCENARIO_VERSION, selectAfterActionReportSubmission, unresolvedRiskList } from "./engine";
import { afterActionReportHtml, workshopComparisonHtml, workshopCsv } from "./report";
import type { DecisionState, EvidenceRequest, ParticipantProfile, Submission, WorkshopSession } from "./types";

const resolved: DecisionState = {
  mandateConfirmed: true,
  mandateRationale: "DMO recommends; sovereign authority commits.",
  liquidityAction: "VERIFY_NOW",
  liquidityRationale: "The restriction may change usable liquidity.",
  liquidityBasis: "VERIFIED_480",
  liquidityBasisRationale: "Reconciled against Treasury evidence.",
  accountClassification: "EFFECTIVE_CONTROL",
  facilityLinkage: "SHARED_POOL",
  linkageRationale: "Both agreements reference RA-01.",
  disclosure: "REDACTED",
  treatmentPerimeter: "BOTH_FACILITIES",
  disclosureRationale: "Share functional facts without restricted text.",
  readiness: "READY_WITH_CONDITIONS",
  unresolvedRisks: "Creditor headquarters authorization remains outstanding.",
  nextHandoff: "Finance Ministry Lead to confirm the OCC instruction.",
  finalRationale: "The package is analytically ready, subject to authorization.",
  reflection: "Verification changed the liquidity basis.",
};

const reviewMoment = "2026-10-14T10:20:00Z";

function evidence(evidenceId: string, available: boolean): EvidenceRequest {
  return {
    id: `request-${evidenceId}`,
    sessionId: "session-1",
    participantId: "participant-1",
    evidenceId,
    requestedAt: "2026-10-14T10:00:00Z",
    availableAt: available ? "2026-10-14T10:10:00Z" : "2026-10-14T10:30:00Z",
  };
}

function recommendationReview(decisions: DecisionState, evidenceRequests: EvidenceRequest[] = []) {
  return reviewRecommendation({ decisions, evidenceRequests, reviewedAt: reviewMoment });
}

function supportFor(review: ReturnType<typeof recommendationReview>, claim: string) {
  return review.items.find((item) => item.claim === claim);
}

const participant: ParticipantProfile = {
  id: "participant-1",
  sessionId: "session-1",
  name: "Amina",
  organization: "Kuvera DMO",
  email: "amina@example.org",
  currentStage: 6,
  lastActiveAt: reviewMoment,
  consentedAt: "2026-10-14T10:00:00Z",
};

const runningSession: WorkshopSession = {
  id: "session-1",
  title: "Kuvera Financing Assurances",
  kind: "LIVE",
  status: "RUNNING",
  currentStage: 6,
  durationSeconds: 1200,
  remainingSeconds: 1200,
  clockStartedAt: "2026-10-14T10:00:00Z",
  submissionsClosed: false,
  createdAt: "2026-10-14T10:00:00Z",
  expiresAt: "2026-11-13T10:00:00Z",
};

describe("participant debrief and transfer", () => {
  it("closes submissions, pauses the clock, and unlocks debrief as one transition", () => {
    const debrief = beginDebriefSession(runningSession, "2026-10-14T10:03:00Z");
    expect(debrief.status).toBe("DEBRIEF");
    expect(debrief.submissionsClosed).toBe(true);
    expect(debrief.currentStage).toBe(7);
    expect(debrief.remainingSeconds).toBe(1020);
    expect(debrief.clockStartedAt).toBeUndefined();
  });

  it("routes a subscribed participant to the final stage without a page refresh", () => {
    const debrief = beginDebriefSession(runningSession, "2026-10-14T10:03:00Z");
    expect(participantAvailableStage(debrief, participant, false)).toBe(7);
    expect(participantEntryStage(debrief, participant)).toBe(7);
  });

  it("reconstructs the submitted version instead of later unsent working edits", () => {
    const submission = { id: "submission-1", participantId: participant.id, sessionId: runningSession.id, version: 1, decisions: resolved, submittedAt: reviewMoment };
    const debrief = buildParticipantDebrief({
      participantId: participant.id,
      submissions: [submission],
      evidenceRequests: [evidence("treasury-reconciliation", true)],
      injects: [],
    });
    const unsentWorkingEdits = { ...resolved, readiness: "NOT_READY" as const, liquidityBasis: "UNRESOLVED" as const };
    expect(unsentWorkingEdits.readiness).not.toBe(submission.decisions.readiness);
    expect(debrief?.version).toBe(1);
    expect(debrief?.position).toBe("Ready with conditions");
    expect(debrief?.consequences.some((item) => item.id === "verified-basis")).toBe(true);
  });

  it("saves transfer reflection without mutating the submitted decision snapshot", async () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    try {
      const localParticipant = { ...participant, sessionId: "local-rehearsal" };
      const bundle: ParticipantBundle = {
        session: { ...runningSession, id: "local-rehearsal", kind: "REHEARSAL" },
        participant: localParticipant,
        decisions: resolved,
        evidenceRequests: [], submissions: [], injects: [], messages: [], advisorTurns: [], timeline: [],
      };
      const submitted = await submitRecommendation(bundle);
      const debriefBundle: ParticipantBundle = {
        ...submitted,
        session: { ...submitted.session, status: "DEBRIEF", currentStage: 7, submissionsClosed: true, clockStartedAt: undefined },
        decisions: { ...submitted.decisions, readiness: "NOT_READY", reflection: "An unsent working reflection." },
      };
      const saved = await saveTransferReflection(debriefBundle, "I will name the evidence dependency before recommending action.");
      expect(saved.decisions.reflection).toContain("name the evidence dependency");
      expect(saved.submissions[0].decisions.readiness).toBe("READY_WITH_CONDITIONS");
      expect(saved.submissions[0].decisions.reflection).toBe(resolved.reflection);
      const report = buildAfterActionReport({
        participant: saved.participant,
        session: saved.session,
        decisions: saved.decisions,
        evidenceRequests: [],
        submissions: saved.submissions,
        advisorTurns: [], injects: [], institutionalMessages: [], timeline: [],
      });
      expect(report.decisions.reflection).toBe(resolved.reflection);
      expect(report.transferReflection).toBe(saved.decisions.reflection);
      expect(afterActionReportHtml(report)).toContain("Transfer reflection");
      expect(afterActionReportHtml(report)).toContain(saved.decisions.reflection);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("filters every participant-scoped debrief record before reconstruction", () => {
    const ownSubmission = { id: "submission-1", participantId: participant.id, sessionId: runningSession.id, version: 1, decisions: resolved, submittedAt: reviewMoment };
    const otherSubmission = { id: "submission-other", participantId: "participant-other", sessionId: runningSession.id, version: 99, decisions: { ...resolved, finalRationale: "OTHER PARTICIPANT PRIVATE DECISION" }, submittedAt: reviewMoment };
    const debrief = buildParticipantDebrief({
      participantId: participant.id,
      submissions: [ownSubmission, otherSubmission],
      evidenceRequests: [{ ...evidence("confidentiality-opinion", true), participantId: "participant-other" }],
      institutionalMessages: [{ id: "message-other", sessionId: runningSession.id, participantId: "participant-other", institution: "LEGAL", question: "Private question", reply: "OTHER PARTICIPANT PRIVATE REPLY", status: "ANSWERED", createdAt: "2026-10-14T10:05:00Z", answeredAt: "2026-10-14T10:06:00Z" }],
      injects: [],
    });
    expect(debrief?.version).toBe(1);
    expect(debrief?.evidenceAvailable).toEqual([]);
    expect(debrief).not.toHaveProperty("participantId");
    expect(JSON.stringify(debrief)).not.toContain("OTHER PARTICIPANT");
  });

  it("names fixed assumptions and the fictional, non-scoring boundary", () => {
    const debrief = buildParticipantDebrief({
      participantId: participant.id,
      submissions: [{ id: "submission-1", participantId: participant.id, sessionId: runningSession.id, version: 1, decisions: resolved, submittedAt: reviewMoment }],
      evidenceRequests: [],
      injects: [
        { id: "inject-1", sessionId: runningSession.id, title: "Time compression", body: "The maturity window is unchanged.", sentAt: "2026-10-14T10:10:00Z" },
        { id: "inject-late", sessionId: runningSession.id, title: "After submission", body: "This arrived after the preserved version.", sentAt: "2026-10-14T10:21:00Z" },
      ],
    });
    expect(debrief?.counterfactual.fixedAssumptions).toContain("same restricted and protected balances");
    expect(debrief?.fictionalBoundary).toContain("fictional");
    expect(debrief?.fictionalBoundary).toContain("not a real-world prediction, score, or competence finding");
    expect(debrief?.facilitatorInjects).toHaveLength(1);
  });

  it("restores the participant debrief after refresh while the session remains in DEBRIEF", () => {
    const refreshedSession = { ...runningSession, status: "DEBRIEF" as const, currentStage: 7, submissionsClosed: true, clockStartedAt: undefined };
    expect(participantEntryStage(refreshedSession, { ...participant, currentStage: 2 })).toBe(7);
  });
});

describe("deterministic consequence engine", () => {
  it("pins the verified liquidity and shared-pool outcomes", () => {
    const results = deriveConsequences(resolved);
    expect(results.some((item) => item.id === "verified-basis" && item.outcome.includes("USD 480m"))).toBe(true);
    expect(results.some((item) => item.id === "shared-pool" && item.severity === "POSITIVE")).toBe(true);
  });

  it("does not manufacture a blocking risk for the resolved pathway", () => {
    expect(unresolvedRiskList({ ...resolved, unresolvedRisks: "" })).toEqual([]);
  });

  it("flags a ready recommendation that retains blocking uncertainty", () => {
    const results = deriveConsequences({
      ...resolved,
      liquidityBasis: "REPORTED_780",
      facilityLinkage: "INDEPENDENT",
      disclosure: "WITHHOLD",
      readiness: "READY",
    });
    expect(results.some((item) => item.id === "readiness-mismatch")).toBe(true);
    expect(results.filter((item) => item.severity === "BLOCKING").length).toBeGreaterThan(1);
  });

  it("counterfactuals change one authored decision while naming fixed assumptions", () => {
    const items = deriveCounterfactuals({ ...resolved, liquidityAction: "PROCEED_WITH_CAVEAT" });
    expect(items.some((item) => item.id === "verify-earlier")).toBe(true);
    expect(items.every((item) => item.fixedAssumptions.length > 0)).toBe(true);
  });

  it("retains facilitator role-play correspondence in the after-action record", () => {
    const report = buildAfterActionReport({
      participant: { id: "participant-1", sessionId: "session-1", name: "Amina", organization: "Kuvera DMO", email: "amina@example.org", currentStage: 7, lastActiveAt: "2026-10-14T10:20:00Z", consentedAt: "2026-10-14T10:00:00Z" },
      session: { id: "session-1", title: "Kuvera Financing Assurances", kind: "LIVE", status: "DEBRIEF", currentStage: 7, durationSeconds: 1200, remainingSeconds: 0, submissionsClosed: true, createdAt: "2026-10-14T10:00:00Z", expiresAt: "2026-11-13T10:00:00Z" },
      decisions: resolved,
      evidenceRequests: [],
      submissions: [],
      advisorTurns: [],
      injects: [],
      institutionalMessages: [{ id: "message-1", sessionId: "session-1", participantId: "participant-1", institution: "LEGAL", question: "Can we disclose the account-control summary?", reply: "A redacted functional summary is permitted in this scenario.", status: "ANSWERED", createdAt: "2026-10-14T10:05:00Z", answeredAt: "2026-10-14T10:06:00Z" }],
      timeline: [],
    });
    expect(report.institutionalMessages).toHaveLength(1);
    expect(report.institutionalMessages[0].reply).toContain("redacted functional summary");
  });
});

describe("negotiation-preparation brief", () => {
  it("uses returned evidence and excludes requested evidence that is still pending", () => {
    const brief = buildNegotiationPreparationBrief({
      decisions: resolved,
      evidenceRequests: [evidence("treasury-reconciliation", true), evidence("confidentiality-opinion", false)],
      preparedAt: reviewMoment,
    });
    expect(brief.evidenceBasis.map((item) => item.id)).toEqual(["treasury-reconciliation"]);
    expect(brief.evidenceBasis[0].summary).toContain("USD 480m");
    expect(brief.evidenceBasis.some((item) => item.summary.includes("redacted functional summary"))).toBe(false);
    expect(brief.knownUncertainties.some((item) => item.includes("legal confidentiality opinion has not returned"))).toBe(true);
  });

  it("allows an honest NOT_READY brief with a recorded handoff", () => {
    expect(negotiationBriefIsSubmittable({ ...resolved, readiness: "NOT_READY" })).toBe(true);
  });

  it("retains the handoff in the AAR, version history, and reconstructable exports", () => {
    const first = { ...resolved, nextHandoff: "Treasury to reconcile the protected balance." };
    const second = { ...resolved, nextHandoff: "Finance Ministry Lead to issue the OCC instruction." };
    const report = buildAfterActionReport({
      participant: { id: "participant-1", sessionId: "session-1", name: "Amina", organization: "Kuvera DMO", email: "amina@example.org", currentStage: 7, lastActiveAt: reviewMoment, consentedAt: "2026-10-14T10:00:00Z" },
      session: { id: "session-1", title: "Kuvera Financing Assurances", kind: "LIVE", status: "DEBRIEF", currentStage: 7, durationSeconds: 1200, remainingSeconds: 0, submissionsClosed: true, createdAt: "2026-10-14T10:00:00Z", expiresAt: "2026-11-13T10:00:00Z" },
      decisions: second,
      evidenceRequests: [evidence("treasury-reconciliation", true)],
      submissions: [
        { id: "submission-1", participantId: "participant-1", sessionId: "session-1", version: 1, decisions: first, submittedAt: "2026-10-14T10:15:00Z" },
        { id: "submission-2", participantId: "participant-1", sessionId: "session-1", version: 2, decisions: second, submittedAt: reviewMoment },
      ],
      advisorTurns: [], injects: [], institutionalMessages: [], timeline: [],
    });
    expect(report.negotiationPreparationBrief.nextInstitutionalHandoff).toBe(second.nextHandoff);
    expect(report.negotiationPreparationBrief).toEqual(buildNegotiationPreparationBrief({ decisions: second, evidenceRequests: [evidence("treasury-reconciliation", true)], preparedAt: reviewMoment }));
    expect(report.submissionBriefs.map((item) => item.brief.nextInstitutionalHandoff)).toEqual([first.nextHandoff, second.nextHandoff]);
    expect(afterActionReportHtml(report)).toContain(second.nextHandoff);
    expect(workshopComparisonHtml([report], false)).toContain(second.nextHandoff);
    expect(workshopCsv([report])).toContain(second.nextHandoff);
  });

  it("labels the artifact as preparation rather than a negotiated result or creditor assurance", () => {
    const report = buildAfterActionReport({
      participant: { id: "participant-1", sessionId: "session-1", name: "Amina", organization: "Kuvera DMO", email: "amina@example.org", currentStage: 7, lastActiveAt: reviewMoment, consentedAt: "2026-10-14T10:00:00Z" },
      session: { id: "session-1", title: "Kuvera Financing Assurances", kind: "LIVE", status: "DEBRIEF", currentStage: 7, durationSeconds: 1200, remainingSeconds: 0, submissionsClosed: true, createdAt: "2026-10-14T10:00:00Z", expiresAt: "2026-11-13T10:00:00Z" },
      decisions: resolved, evidenceRequests: [], submissions: [], advisorTurns: [], injects: [], institutionalMessages: [], timeline: [],
    });
    const html = afterActionReportHtml(report);
    expect(html).toContain("Negotiation-preparation brief");
    expect(html).not.toContain("<h2>Negotiated outcome</h2>");
    expect(html).not.toContain("<h2>Creditor assurance</h2>");
  });
});

describe("recommendation evidence-support review", () => {
  it("marks USD 480m unsupported before Treasury evidence is available", () => {
    const review = recommendationReview(resolved, [evidence("treasury-reconciliation", false)]);
    expect(supportFor(review, "LIQUIDITY_BASIS")?.status).toBe("UNSUPPORTED");
    expect(supportFor(review, "LIQUIDITY_BASIS")?.explanation).toContain("has not returned");
  });

  it("marks USD 480m supported after Treasury evidence is available", () => {
    const review = recommendationReview(resolved, [evidence("treasury-reconciliation", true)]);
    expect(supportFor(review, "LIQUIDITY_BASIS")?.status).toBe("SUPPORTED");
  });

  it("does not retain the provisional USD 780m basis after reconciliation is available", () => {
    const review = recommendationReview({ ...resolved, liquidityBasis: "REPORTED_780" }, [evidence("treasury-reconciliation", true)]);
    expect(supportFor(review, "LIQUIDITY_BASIS")?.status).toBe("UNSUPPORTED");
    expect(supportFor(review, "LIQUIDITY_BASIS")?.evidenceIds).toContain("treasury-reconciliation");
  });

  it("does not support a shared-pool claim before Facility B or dependency evidence", () => {
    const withoutFacilityEvidence = recommendationReview(resolved);
    expect(supportFor(withoutFacilityEvidence, "FACILITY_LINKAGE")?.status).toBe("UNSUPPORTED");

    const withFacilityAOnly = recommendationReview(resolved, [evidence("facility-a", true)]);
    expect(supportFor(withFacilityAOnly, "FACILITY_LINKAGE")?.status).toBe("CONDITIONAL");
    expect(supportFor(withFacilityAOnly, "FACILITY_LINKAGE")?.explanation).toContain("Facility B");
  });

  it("treats unresolved linkage with no evidence as unresolved rather than incorrect", () => {
    const review = recommendationReview({ ...resolved, facilityLinkage: "UNRESOLVED" });
    expect(supportFor(review, "FACILITY_LINKAGE")?.status).toBe("UNRESOLVED");
  });

  it("marks redacted disclosure conditional before the legal opinion returns", () => {
    const review = recommendationReview(resolved, [evidence("confidentiality-opinion", false)]);
    expect(supportFor(review, "DISCLOSURE_RECOMMENDATION")?.status).toBe("CONDITIONAL");
    expect(supportFor(review, "DISCLOSURE_RECOMMENDATION")?.explanation).toContain("has not returned");
  });

  it("keeps NOT_READY with unresolved evidence as a valid submission posture", () => {
    const review = recommendationReview({
      ...resolved,
      liquidityBasis: "UNRESOLVED",
      accountClassification: "UNRESOLVED",
      facilityLinkage: "UNRESOLVED",
      treatmentPerimeter: "DEFER",
      readiness: "NOT_READY",
    });
    expect(supportFor(review, "READINESS_POSITION")?.status).toBe("SUPPORTED");
    expect(review.submissionAllowed).toBe(true);
  });

  it("produces a visible mismatch when READY includes a blocking unsupported claim", () => {
    const review = recommendationReview({ ...resolved, readiness: "READY" });
    expect(supportFor(review, "LIQUIDITY_BASIS")?.status).toBe("UNSUPPORTED");
    expect(supportFor(review, "READINESS_POSITION")?.status).toBe("UNSUPPORTED");
    expect(review.readyMismatch).toBe(true);
    expect(review.mismatchExplanation).toContain("READY exceeds");
    expect(review.submissionAllowed).toBe(true);
  });

  it("uses the same evidence-incorporation review and language in the AAR", () => {
    const evidenceRequests = [evidence("treasury-reconciliation", true)];
    const expected = reviewRecommendation({ decisions: resolved, evidenceRequests, reviewedAt: reviewMoment });
    const report = buildAfterActionReport({
      participant: { id: "participant-1", sessionId: "session-1", name: "Amina", organization: "Kuvera DMO", email: "amina@example.org", currentStage: 7, lastActiveAt: reviewMoment, consentedAt: "2026-10-14T10:00:00Z" },
      session: { id: "session-1", title: "Kuvera Financing Assurances", kind: "LIVE", status: "DEBRIEF", currentStage: 7, durationSeconds: 1200, remainingSeconds: 0, submissionsClosed: true, createdAt: "2026-10-14T10:00:00Z", expiresAt: "2026-11-13T10:00:00Z" },
      decisions: resolved,
      evidenceRequests,
      submissions: [{ id: "submission-1", participantId: "participant-1", sessionId: "session-1", version: 1, decisions: resolved, submittedAt: reviewMoment }],
      advisorTurns: [],
      injects: [],
      institutionalMessages: [],
      timeline: [],
    });
    expect(report.recommendationReview).toEqual(expected);
    expect(report.submissionRecommendationReviews[0].review).toEqual(expected);
    const liquidityReview = supportFor(expected, "LIQUIDITY_BASIS");
    expect(liquidityReview).toBeDefined();
    expect(afterActionReportHtml(report)).toContain(liquidityReview!.explanation);
  });
});

describe("frozen submission replay", () => {
  const inject = { id: "inject-1", sessionId: "session-1", title: "Deadline update", body: "Private bounded inject body", sentAt: "2026-10-14T10:12:00Z" };
  const answeredMessage = { id: "message-1", sessionId: "session-1", participantId: "participant-1", institution: "LEGAL" as const, question: "May we share a summary?", reply: "Private authorized reply", status: "ANSWERED" as const, createdAt: "2026-10-14T10:05:00Z", answeredAt: "2026-10-14T10:14:00Z" };

  function frozenSubmission(
    decisions: DecisionState,
    version: number,
    submittedAt: string,
    evidenceRequests: EvidenceRequest[],
  ): Submission {
    return {
      id: `submission-${version}`,
      participantId: participant.id,
      sessionId: runningSession.id,
      version,
      decisions: structuredClone(decisions),
      submittedAt,
      contextSnapshot: buildSubmissionContextSnapshot({
        participantId: participant.id,
        sessionId: runningSession.id,
        decisions,
        version,
        submittedAt,
        evidenceRequests,
        injects: [inject],
        institutionalMessages: [answeredMessage],
      }),
    };
  }

  it("captures the complete bounded context and excludes requested-but-pending evidence", () => {
    const returned = { ...evidence("treasury-reconciliation", false), releasedAt: "2026-10-14T10:15:00Z" };
    const pending = evidence("confidentiality-opinion", false);
    const submission = frozenSubmission(resolved, 1, reviewMoment, [returned, pending]);
    const snapshot = submission.contextSnapshot!;

    expect(snapshot).toMatchObject({
      schemaVersion: 1,
      scenarioVersion: SCENARIO_VERSION,
      consequenceRuleVersion: CONSEQUENCE_RULE_VERSION,
      submissionVersion: 1,
      submittedAt: new Date(reviewMoment).toISOString(),
      decisions: resolved,
      facilitatorInjectIds: [inject.id],
      answeredInstitutionalMessageIds: [answeredMessage.id],
    });
    expect(snapshot.availableEvidence.map((item) => item.evidenceId)).toEqual(["treasury-reconciliation"]);
    expect(snapshot.availableEvidence[0]).toMatchObject({
      requestId: returned.id,
      requestedAt: returned.requestedAt,
      availableAt: returned.availableAt,
      releasedAt: returned.releasedAt,
    });
    expect(JSON.stringify(snapshot)).not.toContain(inject.body);
    expect(JSON.stringify(snapshot)).not.toContain(answeredMessage.reply);
  });

  it("does not let later returned evidence alter an earlier evidence-support review", () => {
    const pendingAtSubmission = evidence("treasury-reconciliation", false);
    const submission = frozenSubmission(resolved, 1, reviewMoment, [pendingAtSubmission]);
    const returnedLater = { ...pendingAtSubmission, releasedAt: "2026-10-14T10:25:00Z" };
    const replay = buildSubmissionReplay({
      submission,
      evidenceRequests: [returnedLater],
      institutionalMessages: [answeredMessage],
      injects: [inject],
    });
    expect(submission.contextSnapshot?.availableEvidence).toEqual([]);
    expect(replay.evidenceAvailable.map((item) => item.id)).toEqual([
      `institutional-message-${answeredMessage.id}`,
    ]);
    expect(replay.evidenceAvailable.some((item) => item.id === "treasury-reconciliation")).toBe(false);
    expect(supportFor(replay.recommendationReview, "LIQUIDITY_BASIS")?.status).toBe("UNSUPPORTED");
    expect(replay.replayProvenance.mode).toBe("FROZEN");
  });

  it("keeps later working edits out of a selected frozen report", () => {
    const submission = frozenSubmission(resolved, 1, reviewMoment, [evidence("treasury-reconciliation", true)]);
    const working = { ...resolved, liquidityBasis: "UNRESOLVED" as const, readiness: "NOT_READY" as const, finalRationale: "UNSENT WORKING EDIT" };
    const report = buildAfterActionReport({
      participant,
      session: { ...runningSession, status: "DEBRIEF", currentStage: 7, submissionsClosed: true },
      decisions: working,
      evidenceRequests: [evidence("treasury-reconciliation", true)],
      submissions: [submission],
      advisorTurns: [], injects: [inject], institutionalMessages: [answeredMessage], timeline: [],
    });
    expect(report.decisions).toEqual(resolved);
    expect(report.negotiationPreparationBrief.financeMinistryRecommendation).toBe(resolved.finalRationale);
    expect(report.consequences.some((item) => item.id === "verified-basis")).toBe(true);
    expect(JSON.stringify(report.negotiationPreparationBrief)).not.toContain("UNSENT WORKING EDIT");
  });

  it("keeps separate versions selectable with their own decisions and consequences", () => {
    const firstDecisions = { ...resolved, liquidityBasis: "UNRESOLVED" as const, readiness: "NOT_READY" as const };
    const first = frozenSubmission(firstDecisions, 1, "2026-10-14T10:08:00Z", []);
    const second = frozenSubmission(resolved, 2, reviewMoment, [evidence("treasury-reconciliation", true)]);
    const latest = buildAfterActionReport({
      participant,
      session: { ...runningSession, status: "DEBRIEF", currentStage: 7, submissionsClosed: true },
      decisions: resolved,
      evidenceRequests: [evidence("treasury-reconciliation", true)],
      submissions: [first, second],
      advisorTurns: [], injects: [inject], institutionalMessages: [answeredMessage], timeline: [],
    });
    const versionOne = selectAfterActionReportSubmission(latest, 1);
    expect(latest.selectedSubmissionVersion).toBe(2);
    expect(latest.consequences.some((item) => item.id === "verified-basis")).toBe(true);
    expect(versionOne.selectedSubmissionVersion).toBe(1);
    expect(versionOne.decisions.readiness).toBe("NOT_READY");
    expect(versionOne.consequences.some((item) => item.id === "unreconciled-basis")).toBe(true);
  });

  it("keeps legacy rows readable and labels current-rule reconstruction explicitly", () => {
    const legacy: Submission = { id: "legacy-1", participantId: participant.id, sessionId: runningSession.id, version: 1, decisions: resolved, submittedAt: reviewMoment };
    const replay = buildSubmissionReplay({ submission: legacy, evidenceRequests: [], institutionalMessages: [], injects: [] });
    expect(replay.replayProvenance.mode).toBe("LEGACY_CURRENT_RULE_RECONSTRUCTION");
    expect(replay.replayProvenance.label).toBe("legacy · current-rule reconstruction");
    expect(replay.decisions).toEqual(resolved);
  });

  it("shows replay provenance in reconstructable HTML, CSV, and JSON data", () => {
    const submission = frozenSubmission(resolved, 1, reviewMoment, [evidence("treasury-reconciliation", true)]);
    const report = buildAfterActionReport({
      participant,
      session: { ...runningSession, status: "DEBRIEF", currentStage: 7, submissionsClosed: true },
      decisions: resolved,
      evidenceRequests: [evidence("treasury-reconciliation", true)],
      submissions: [submission],
      advisorTurns: [], injects: [inject], institutionalMessages: [answeredMessage], timeline: [],
    });
    expect(afterActionReportHtml(report)).toContain("Replay provenance");
    expect(afterActionReportHtml(report)).toContain(SCENARIO_VERSION);
    expect(workshopCsv([report])).toContain(CONSEQUENCE_RULE_VERSION);
    expect(JSON.stringify(report)).toContain('"mode":"FROZEN"');
  });
});
