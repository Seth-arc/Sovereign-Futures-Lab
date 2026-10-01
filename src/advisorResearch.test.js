import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { scriptedAdvisorTurn } from "./data";
import { CASE_FACTS, CASE_FILE_SECTIONS, FINAL_STAGE_INDEX } from "./scenario";
import { EMPTY_DECISIONS } from "./types";
import {
  RESEARCH_CARDS,
  citationFor,
  citationsUsedByAnswer,
  isExplicitPolicyQuestion,
  researchBoundaryResponse,
  researchCardsForClaimIds,
  researchPrompt,
  retrieveResearchCards,
  stripClaimMarkers,
} from "../supabase/functions/advisor-chat/research";

const researchCardsDocument = readFileSync(
  new URL("../docs/research/research-cards.yaml", import.meta.url),
  "utf8",
);
const approvedCardsSection = researchCardsDocument.split(/\r?\nexcluded_claims:/)[0];
const advisorFunctionSource = readFileSync(
  new URL("../supabase/functions/advisor-chat/index.ts", import.meta.url),
  "utf8",
);
const participantSource = readFileSync(new URL("./ParticipantApp.tsx", import.meta.url), "utf8");
const caseFileSource = JSON.stringify(CASE_FILE_SECTIONS);
const approvedDocumentClaimIds = [...approvedCardsSection.matchAll(/^- claim_id: (\S+)/gm)]
  .map((match) => match[1])
  .sort();

function participantBundle(evidenceIds = []) {
  const now = new Date().toISOString();
  return {
    session: { id: "local-test", title: "Test", kind: "REHEARSAL", status: "RUNNING", currentStage: FINAL_STAGE_INDEX, durationSeconds: CASE_FACTS.caseworkDurationSeconds, remainingSeconds: CASE_FACTS.caseworkDurationSeconds, submissionsClosed: false, createdAt: now, expiresAt: now },
    participant: { id: "participant-test", sessionId: "local-test", name: "Test", organization: "Test", email: "test@example.org", currentStage: 0, lastActiveAt: now, consentedAt: now },
    decisions: { ...EMPTY_DECISIONS },
    evidenceRequests: evidenceIds.map((evidenceId) => ({ id: `request-${evidenceId}`, sessionId: "local-test", participantId: "participant-test", evidenceId, requestedAt: now, availableAt: now, releasedAt: now })),
    submissions: [],
    injects: [],
    messages: [],
    advisorTurns: [],
    timeline: [],
  };
}

describe("advisor research retrieval", () => {
  it("indexes exactly the approved research cards and never the blocked progress DOCX", () => {
    const runtimeClaimIds = RESEARCH_CARDS.map((card) => card.claimId).sort();
    const serialized = JSON.stringify(RESEARCH_CARDS);

    expect(runtimeClaimIds).toEqual(approvedDocumentClaimIds);
    expect(RESEARCH_CARDS).toHaveLength(21);
    expect(serialized).not.toContain("CLAIM-CF-PROGRESS-001");
    expect(serialized).not.toContain("SRC-CF-PROGRESS");
    expect(serialized.toLowerCase()).not.toContain(".docx");
    expect(RESEARCH_CARDS.every((card) => card.supportingExcerpt.trim().length > 0)).toBe(true);
    expect(RESEARCH_CARDS.every((card) => card.supportingExcerpt.trim().split(/\s+/).length <= 35)).toBe(true);
  });

  it("retrieves deterministically by topic and keyword", () => {
    const question = "Why is Comparability of Treatment not one haircut number?";
    const first = retrieveResearchCards(question, "daniel").map((card) => card.claimId);
    const second = retrieveResearchCards(question, "daniel").map((card) => card.claimId);

    expect(first).toEqual(second);
    expect(first).toContain("CLAIM-CF-004");
    expect(first).toContain("CLAIM-G20-003");
    expect(first.length).toBeLessThanOrEqual(4);
  });

  it("gates policy proposals behind explicit policy or reform questions", () => {
    const ordinary = retrieveResearchCards("How does confidentiality affect disclosure?", "daniel");
    const reform = retrieveResearchCards(
      "What statutory policy reforms could improve private creditor participation and address holdouts?",
      "daniel",
    );

    expect(isExplicitPolicyQuestion("How does confidentiality affect disclosure?")).toBe(false);
    expect(ordinary.every((card) => card.authorityTier !== "POLICY_PROPOSAL")).toBe(true);
    expect(isExplicitPolicyQuestion("What statutory reforms could address holdouts?")).toBe(true);
    expect(reform.map((card) => card.claimId)).toContain("CLAIM-WB-001");
  });

  it("enforces scenario authority and only supplies returned evidence", () => {
    const authorityLabels = [
      "1. Participant-visible Kuvera sources and returned institutional evidence.",
      "2. Official G20 and Common Framework sources.",
      "3. Illustrative templates",
      "4. Empirical research",
      "5. Policy proposals",
    ];
    const positions = authorityLabels.map((label) => advisorFunctionSource.indexOf(label));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
    expect(advisorFunctionSource).toContain(
      "Research explains mechanisms and reasoning patterns. It must never replace, revise, or manufacture Kuvera facts",
    );
    expect(advisorFunctionSource).toContain("Boolean(row.released_at)");
    expect(advisorFunctionSource).toContain("new Date(String(row.available_at)).getTime() <= now");
  });

  it("keeps evidence-specific facts out of baseline advisor context and includes them after return", () => {
    const baselineBlock = advisorFunctionSource.match(/const BASELINE_SCENARIO_SOURCES[\s\S]*?\n\];/)?.[0] ?? "";
    const evidenceBlock = advisorFunctionSource.match(/const EVIDENCE_SCENARIO_SOURCES[\s\S]*?\n\];/)?.[0] ?? "";

    expect(baselineBlock).toContain("Kuvera reports USD 780m");
    expect(baselineBlock).toContain("Facility B's relationship to the account is unconfirmed");
    expect(baselineBlock).toContain("Permitted disclosure and the creditor's commitment status begin unresolved");
    expect(baselineBlock).not.toMatch(/USD (?:240|60|480)m/);
    expect(baselineBlock).not.toContain("depends on the same RA-01 pool");
    expect(evidenceBlock).toContain("USD 240m is restricted and USD 60m is protected, producing USD 480m usable liquidity");
    expect(evidenceBlock).toContain("depends on the same RA-01 pool used by Facility A");
    expect(advisorFunctionSource).toContain('const withheld = "WITHHELD_PENDING_PARTICIPANT_VISIBLE_EVIDENCE"');
    expect(advisorFunctionSource).toContain('availableEvidenceIds.has("treasury-reconciliation") ? record.liquidityBasis : withheld');
    expect(advisorFunctionSource).toContain('availableEvidenceIds.has("confidentiality-opinion") ? record.disclosure : withheld');
  });

  it("applies the same pre-evidence and post-evidence boundary in scripted advisor fallback", () => {
    const baseline = participantBundle();
    const liquidityBefore = scriptedAdvisorTurn(baseline, "amara", "What is Kuvera's usable liquidity?").answer;
    const linkageBefore = scriptedAdvisorTurn(baseline, "daniel", "Does Facility B share the account?").answer;
    const disclosureBefore = scriptedAdvisorTurn(baseline, "daniel", "What disclosure is permitted?").answer;
    const commitmentBefore = scriptedAdvisorTurn(baseline, "daniel", "What is the creditor commitment status?").answer;

    expect(liquidityBefore).not.toMatch(/USD (?:240|60|480)m/);
    expect(linkageBefore).toContain("remains unconfirmed");
    expect(disclosureBefore).toContain("does not yet establish Kuvera's permitted disclosure boundary");
    expect(commitmentBefore).toContain("not established");

    expect(scriptedAdvisorTurn(participantBundle(["treasury-reconciliation"]), "amara", "What is Kuvera's usable liquidity?").answer).toContain("USD 480m usable");
    expect(scriptedAdvisorTurn(participantBundle(["facility-b"]), "daniel", "Does Facility B share the account?").answer).toContain("connecting Facility B to the RA-01 arrangement");
    expect(scriptedAdvisorTurn(participantBundle(["confidentiality-opinion"]), "daniel", "What disclosure is permitted?").answer).toContain("permits a redacted functional summary");
    expect(scriptedAdvisorTurn(participantBundle(["creditor-status"]), "daniel", "What is the creditor commitment status?").answer).toContain("headquarters authorization remains outstanding");
  });

  it("retains structured citations while removing internal claim markers from visible prose", () => {
    const cards = retrieveResearchCards("What are the three CoT indicators?", "daniel");
    const rawAnswer = "The assessment considers NPV, duration, and nominal debt service. [CLAIM-G20-003]";
    const citations = citationsUsedByAnswer(rawAnswer, cards);

    expect(citations).toEqual([
      expect.objectContaining({
        claimId: "CLAIM-G20-003",
        sourceId: "SRC-G20-LL-2024",
        sourceTitle: "G20 Note — Common Framework: Lessons Learned and Ways Forward",
        pageReference: "PDF p. 11, section 1.4",
        sourceClass: "OFFICIAL_INSTITUTIONAL_LESSONS",
      }),
    ]);
    expect(stripClaimMarkers(rawAnswer)).toBe(
      "The assessment considers NPV, duration, and nominal debt service.",
    );
    expect(researchPrompt(cards)).toContain("prohibited_inferences:");
  });

  it.each([
    ["Are all Chinese loans collateralized?", ["CLAIM-HCC-001"]],
    ["Does signing an MoU create cash relief?", ["CLAIM-CF-005"]],
    ["Are the World Bank statutory options current law?", ["CLAIM-WB-001"]],
    ["Is CoT one haircut formula?", ["CLAIM-CF-004", "CLAIM-G20-003"]],
  ])("returns a deterministic no with structured sources for boundary question: %s", (question, claimIds) => {
    const boundary = researchBoundaryResponse(question);

    expect(boundary).not.toBeNull();
    expect(boundary.kind).toBe("BOUNDED_ANSWER");
    expect(boundary.answer).toMatch(/^No\./);
    expect(boundary.claimIds).toEqual(claimIds);
    const citations = researchCardsForClaimIds(boundary.claimIds).map(citationFor);
    expect(citations).toHaveLength(claimIds.length);
    expect(citations.every((citation) => (
      citation.claimId
      && citation.sourceId
      && citation.sourceTitle
      && citation.pageReference
      && citation.sourceClass
    ))).toBe(true);
  });

  it("fails closed when a question relies on the blocked progress DOCX", () => {
    const boundary = researchBoundaryResponse(
      "What does Progress debt treatments_CF.docx say about the latest case chronology?",
    );

    expect(boundary).toEqual(expect.objectContaining({
      kind: "SOURCE_GAP",
      claimIds: [],
    }));
    expect(boundary.answer).toContain("source gap");
    expect(boundary.answer).toContain("cannot use it to answer");
  });

  it("sends Groq only bounded cards and short excerpts, never source files or full reports", () => {
    const prompt = researchPrompt(RESEARCH_CARDS);
    const boundaryCheck = advisorFunctionSource.indexOf("researchBoundaryResponse(question)");
    const providerCall = advisorFunctionSource.indexOf("await completion(system, messages)");

    expect(prompt).toContain("bounded_claim:");
    expect(prompt).toContain("supporting_excerpt:");
    expect(prompt).not.toContain("verified_source_path");
    expect(prompt).not.toContain("repository_path");
    expect(prompt.toLowerCase()).not.toContain(".pdf");
    expect(prompt.toLowerCase()).not.toContain(".docx");
    expect(boundaryCheck).toBeGreaterThan(-1);
    expect(providerCall).toBeGreaterThan(boundaryCheck);
  });
});

describe("participant evidence-discovery boundary", () => {
  it("keeps the exact usable-liquidity result out of the static Case File", () => {
    expect(caseFileSource).toContain(`USD ${CASE_FACTS.reportedLiquidityUsdMillions}m`);
    expect(caseFileSource).toContain("usable result are not established");
    expect(caseFileSource).not.toMatch(/(?:USD |\$)480m/i);
    expect(caseFileSource).not.toMatch(/(?:USD |\$)240m/i);
    expect(caseFileSource).not.toMatch(/(?:USD |\$)60m/i);
  });

  it("keeps Facility B linkage and disclosure permission unresolved in the static Case File", () => {
    expect(caseFileSource).toContain("Facility B's relationship to RA-01 is unconfirmed");
    expect(caseFileSource).toContain('"value":"Permission unresolved"');
    expect(caseFileSource).not.toContain("Creditor knows it draws from the same copper-revenue pool as Facility A");
    expect(caseFileSource).not.toContain("Same creditor / same pool");
    expect(caseFileSource).not.toContain("Present through shared pool");
  });

  it("uses decision options to record claims without explaining the canonical path", () => {
    const stageSource = participantSource.slice(
      participantSource.indexOf("function StageContent"),
      participantSource.indexOf("function InstitutionalRequestDesk"),
    );
    expect(stageSource).toContain("CASE_FACTS.usableLiquidityUsdMillions");
    expect(stageSource).toContain('detail: "Record Facilities A and B as sharing a revenue pool."');
    expect(stageSource).toContain('detail: "Recommend release of a summary with selected details removed."');
    expect(stageSource).not.toContain("Both facilities depend on RA-01 and must be carried in the dependency analysis.");
    expect(stageSource).not.toContain("Share control, balances, and dependency without restricted contract text.");
  });

  it("keeps honest unresolved choices available", () => {
    const choiceGroupSource = participantSource.slice(
      participantSource.indexOf("function ChoiceGroup"),
      participantSource.indexOf("function TextArea"),
    );
    expect(participantSource).toContain('{ value: "UNRESOLVED", title: "Keep the basis unresolved"');
    expect(participantSource).toContain('{ value: "UNRESOLVED", title: "Linkage unresolved"');
    expect(participantSource).toContain('{ value: "DEFER", title: "Defer perimeter recommendation"');
    expect(choiceGroupSource).not.toContain("disabled=");
  });
});
