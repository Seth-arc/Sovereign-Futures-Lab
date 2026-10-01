import { describe, expect, it } from "vitest";
import { buildAfterActionReport, buildNegotiationPreparationBrief, deriveConsequences, deriveCounterfactuals, negotiationBriefIsSubmittable, reviewRecommendation, unresolvedRiskList } from "./engine";
import { afterActionReportHtml, workshopComparisonHtml, workshopCsv } from "./report";
import type { DecisionState, EvidenceRequest } from "./types";

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
