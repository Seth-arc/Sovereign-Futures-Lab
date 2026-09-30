import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");
const cardsDocument = read("../docs/research/research-cards.yaml");
const claimRegister = read("../docs/research/research-claim-register.yaml");
const sourceLedger = read("../docs/research/source-ledger.yaml");

const claimBlocks = (document) =>
  document
    .split(/\r?\n(?=- claim_id:)/)
    .filter((block) => block.startsWith("- claim_id:"));

const cardSection = cardsDocument.split(/\r?\nexcluded_claims:/)[0];
const cardBlocks = claimBlocks(cardSection);
const registeredClaimBlocks = claimBlocks(claimRegister);
const approvedClaimIds = registeredClaimBlocks
  .filter((block) => !block.includes("public_use_status: BLOCKED_"))
  .map((block) => block.match(/^- claim_id: (\S+)/)?.[1])
  .filter(Boolean)
  .sort();

describe("approved research cards", () => {
  it("contains each approved registered claim exactly once and excludes blocked claims", () => {
    const cardIds = cardBlocks
      .map((block) => block.match(/^- claim_id: (\S+)/)?.[1])
      .filter(Boolean);

    expect(cardIds).toHaveLength(21);
    expect(new Set(cardIds).size).toBe(cardIds.length);
    expect([...cardIds].sort()).toEqual(approvedClaimIds);
    expect(cardSection).not.toContain("CLAIM-CF-PROGRESS-001");
    expect(cardsDocument.split(/\r?\nexcluded_claims:/)[1]).toContain("CLAIM-CF-PROGRESS-001");
    expect(cardsDocument).toContain("public_use_status: BLOCKED_PENDING_PROVENANCE");
  });

  it("keeps every required retrieval and governance field on every card", () => {
    const requiredFields = [
      "source_id",
      "source_title",
      "source_class",
      "bounded_claim",
      "exact_page_reference",
      "scope_conditions",
      "prohibited_inferences",
      "public_use_status",
      "supporting_excerpt",
      "advisor_tags",
      "topic_tags",
    ];

    for (const block of cardBlocks) {
      for (const field of requiredFields) {
        expect(block, `${block.split("\n")[0]} is missing ${field}`).toMatch(
          new RegExp(`^  ${field}:`, "m"),
        );
      }
      expect(block).toMatch(/^    text:/m);
      expect(block).toMatch(/^    kind: VERBATIM/m);
      expect(block).toMatch(/^    verified_source_path: docs\/research\/sources\//m);
      expect(block).toMatch(/^    verified_pdf_page: \d+/m);
    }
  });

  it("points every card at a present, ledgered source file using repository paths", () => {
    const sourcePaths = cardBlocks.map(
      (block) => block.match(/^    verified_source_path: (.+)$/m)?.[1],
    );

    for (const sourcePath of sourcePaths) {
      expect(sourcePath).toBeTruthy();
      expect(sourcePath).not.toContain("architecture/research/");
      expect(sourceLedger).toContain(`repository_path: ${sourcePath}`);
      expect(read(`../${sourcePath}`).length).toBeGreaterThan(0);
    }
    expect(sourceLedger).toContain(
      "approved_retrieval_artifact: docs/research/research-cards.yaml",
    );
  });

  it("requires proposal and illustrative labels where the public-use contract requires them", () => {
    for (const block of cardBlocks.filter((entry) =>
      entry.includes("public_use_status: APPROVED_IF_LABELED_PROPOSAL"),
    )) {
      expect(block).toMatch(/^  required_public_label: .+/m);
    }

    for (const block of cardBlocks.filter((entry) =>
      entry.includes("source_class: OFFICIAL_ILLUSTRATIVE_TEMPLATE"),
    )) {
      expect(block).toContain("required_public_label: Undated illustrative, non-binding template");
    }
  });
});
