import { describe, expect, it } from "vitest";
import { buildAfterActionReport, deriveConsequences, deriveCounterfactuals, unresolvedRiskList } from "./engine";
import type { DecisionState } from "./types";

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
  finalRationale: "The package is analytically ready, subject to authorization.",
  reflection: "Verification changed the liquidity basis.",
};

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
