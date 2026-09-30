import type { AdvisorId } from "./types";

export const ADVISOR_RESPONSE_REVEAL_INTERVAL_MS = 36;

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
