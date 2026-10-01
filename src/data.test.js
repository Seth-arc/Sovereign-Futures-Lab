import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decisionSnapshot, saveDecisions, submitRecommendation } from "./data";
import { EMPTY_DECISIONS } from "./types";

const handoff = "Finance Ministry Lead to confirm the OCC instruction.";

function bundle() {
  const now = "2026-10-14T10:00:00Z";
  return {
    session: { id: "local-rehearsal", title: "Kuvera Financing Assurances", kind: "REHEARSAL", status: "RUNNING", currentStage: 7, durationSeconds: 1200, remainingSeconds: 600, submissionsClosed: false, createdAt: now, expiresAt: "2026-11-13T10:00:00Z" },
    participant: { id: "participant-1", sessionId: "local-rehearsal", name: "Amina", organization: "Kuvera DMO", email: "amina@example.org", currentStage: 6, lastActiveAt: now, consentedAt: now },
    decisions: { ...EMPTY_DECISIONS, readiness: "NOT_READY", finalRationale: "Do not advance until the evidence gap closes.", nextHandoff: handoff },
    evidenceRequests: [], submissions: [], injects: [], messages: [], advisorTurns: [], timeline: [],
  };
}

describe("negotiation brief persistence", () => {
  const values = new Map();

  beforeEach(() => {
    values.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("keeps nextHandoff in the shared decision payload used by cloud save", () => {
    const snapshot = decisionSnapshot(bundle().decisions);
    expect(snapshot.nextHandoff).toBe(handoff);
    const source = readFileSync(new URL("./data.ts", import.meta.url), "utf8");
    expect(source).toContain("p_decisions: persistedDecisions");
  });

  it("keeps nextHandoff through local save and submission snapshots", async () => {
    const saved = await saveDecisions(bundle(), bundle().decisions, 6);
    const submitted = await submitRecommendation(saved);
    const stored = JSON.parse([...values.values()][0]);
    expect(saved.decisions.nextHandoff).toBe(handoff);
    expect(submitted.submissions[0].decisions.nextHandoff).toBe(handoff);
    expect(submitted.submissions[0].contextSnapshot.decisions.nextHandoff).toBe(handoff);
    expect(stored.decisions.nextHandoff).toBe(handoff);
    expect(stored.submissions[0].decisions.nextHandoff).toBe(handoff);
    expect(stored.submissions[0].contextSnapshot.decisions.nextHandoff).toBe(handoff);
  });

  it("retains distinct handoffs in versioned local submissions", async () => {
    const first = await submitRecommendation(bundle());
    const revised = await saveDecisions(first, { ...first.decisions, nextHandoff: "Legal Counsel to clear the redacted summary." }, 6);
    const second = await submitRecommendation(revised);
    expect(second.submissions.map((item) => item.decisions.nextHandoff)).toEqual([
      handoff,
      "Legal Counsel to clear the redacted summary.",
    ]);
  });

  it("cloud submission snapshots the complete stored decision JSON", () => {
    const migration = readFileSync(new URL("../supabase/migrations/202610010001_freeze_submission_context.sql", import.meta.url), "utf8");
    expect(migration).toContain("'decisions', v_participant.decisions");
    expect(migration).toContain("v_participant.submission_version");
    expect(migration).toContain("v_context_snapshot");
  });
});
