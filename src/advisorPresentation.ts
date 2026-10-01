import type { AdvisorCitation, AdvisorId } from "./types";

export const ADVISOR_RESPONSE_REVEAL_INTERVAL_MS = 36;

export function advisorResponseUsesInstantReveal(reducedMotion: boolean, chunkCount: number): boolean {
  return reducedMotion || chunkCount === 0;
}

export function splitAdvisorResponse(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [];
}

export function revealAdvisorResponse(chunks: readonly string[], visibleChunkCount: number): string {
  return chunks.slice(0, Math.max(0, visibleChunkCount)).join("").trimEnd();
}

export function isAdvisorGreeting(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (normalized.length > 80) return false;
  return /^(?:hi|hello|hey|good morning|good afternoon|good evening)(?:[\s,.!'-]*(?:there|advisor|amara|daniel|i(?:'m| am) [a-z'-]+|my name is [a-z'-]+))*[\s,.!?]*$/.test(normalized);
}

export function applyAdvisorFallbackCadence(advisorId: AdvisorId, answer: string): string {
  return advisorId === "amara"
    ? `Let's place this in context. ${answer}`
    : `The key distinction is this. ${answer}`;
}

function citationField(record: Record<string, unknown>, camelCase: string, snakeCase: string): string {
  const value = record[camelCase] ?? record[snakeCase];
  return value === null || value === undefined ? "" : String(value).trim();
}

export function normalizeAdvisorCitations(value: unknown): AdvisorCitation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const citation: AdvisorCitation = {
      claimId: citationField(record, "claimId", "claim_id"),
      sourceId: citationField(record, "sourceId", "source_id"),
      sourceTitle: citationField(record, "sourceTitle", "source_title"),
      pageReference: citationField(record, "pageReference", "page_reference"),
      sourceClass: citationField(record, "sourceClass", "source_class"),
    };
    return Object.values(citation).every(Boolean) ? [citation] : [];
  });
}

export function sourceClassLabel(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "Classification unavailable";
  return value.trim().toLowerCase().split("_").map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(" ");
}
