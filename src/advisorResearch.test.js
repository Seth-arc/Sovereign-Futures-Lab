import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
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
const approvedDocumentClaimIds = [...approvedCardsSection.matchAll(/^- claim_id: (\S+)/gm)]
  .map((match) => match[1])
  .sort();

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
      "1. Participant-visible Kuvera facts and deterministic scenario state.",
      "2. Official G20 and Common Framework sources.",
      "3. Illustrative templates",
      "4. Empirical research",
      "5. Policy proposals",
    ];
    const positions = authorityLabels.map((label) => advisorFunctionSource.indexOf(label));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
    expect(advisorFunctionSource).toContain(
      "Research explains the scenario. It must never replace, revise, or overwrite Kuvera's canonical facts",
    );
    expect(advisorFunctionSource).toContain("Boolean(row.released_at)");
    expect(advisorFunctionSource).toContain("new Date(String(row.available_at)).getTime() <= now");
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
