import type { AdvisorId } from "./types";

export type AdvisorVoiceProfile = {
  rate: number;
  pitch: number;
  preferredNameFragments: readonly string[];
  preferredLocales: readonly string[];
};

export const ADVISOR_VOICE_PROFILES: Record<AdvisorId, AdvisorVoiceProfile> = {
  amara: {
    rate: 1,
    pitch: 1,
    preferredNameFragments: ["sonia", "aria", "jenny", "ava", "samantha", "serena", "google uk english female", "google us english"],
    preferredLocales: ["en-GB", "en-US"],
  },
  daniel: {
    rate: 0.98,
    pitch: 1,
    preferredNameFragments: ["ryan", "guy", "davis", "daniel", "alex", "aaron", "google uk english male", "google us english"],
    preferredLocales: ["en-US", "en-GB"],
  },
};

const REJECTED_NAME_FRAGMENTS = [
  "albert", "bad news", "bahh", "bells", "boing", "bubbles", "cellos", "compact", "deranged", "desktop",
  "espeak", "festival", "fred", "good news", "hysterical", "junior", "kathy", "mbrola", "organ", "pico",
  "princess", "ralph", "superstar", "trinoids", "whisper", "zarvox",
] as const;

const QUALITY_NAME_FRAGMENTS = [
  "natural", "neural", "premium", "enhanced", "google",
  "samantha", "serena", "daniel", "alex", "aaron",
] as const;

function normalizedVoiceText(voice: SpeechSynthesisVoice): string {
  return `${voice.name} ${voice.voiceURI}`.toLowerCase();
}

export function advisorVoiceIsAcceptable(voice: SpeechSynthesisVoice): boolean {
  const name = normalizedVoiceText(voice);
  return voice.lang.toLowerCase().startsWith("en")
    && QUALITY_NAME_FRAGMENTS.some((fragment) => name.includes(fragment))
    && !REJECTED_NAME_FRAGMENTS.some((fragment) => name.includes(fragment));
}

function voiceScore(voice: SpeechSynthesisVoice, profile: AdvisorVoiceProfile): number {
  const name = normalizedVoiceText(voice);
  const preferredNameIndex = profile.preferredNameFragments.findIndex((fragment) => name.includes(fragment));
  const preferredLocaleIndex = profile.preferredLocales.findIndex((locale) => voice.lang.toLowerCase() === locale.toLowerCase());
  let score = preferredNameIndex === -1 ? 0 : 120 - preferredNameIndex;
  if (name.includes("natural")) score += 60;
  else if (name.includes("neural")) score += 55;
  else if (name.includes("premium")) score += 45;
  else if (name.includes("enhanced")) score += 40;
  else if (name.includes("google")) score += 30;
  if (preferredLocaleIndex !== -1) score += 12 - preferredLocaleIndex;
  if (voice.default) score += 2;
  return score;
}

/**
 * Browser voice catalogues differ by operating system. Fail closed unless a
 * recognised quality English voice is available, reject known legacy and
 * novelty voices, and do not manipulate pitch. Equal-quality choices remain
 * deterministic.
 */
export function selectAdvisorVoice(
  voices: readonly SpeechSynthesisVoice[],
  advisorId: AdvisorId,
): SpeechSynthesisVoice | undefined {
  const profile = ADVISOR_VOICE_PROFILES[advisorId];
  const candidates = voices
    .filter(advisorVoiceIsAcceptable)
    .map((voice) => ({ voice, score: voiceScore(voice, profile) }))
    .sort((left, right) => right.score - left.score || `${left.voice.lang}|${left.voice.name}|${left.voice.voiceURI}`.localeCompare(`${right.voice.lang}|${right.voice.name}|${right.voice.voiceURI}`));
  if (!candidates.length) return undefined;
  if (advisorId === "daniel" && candidates.length > 1 && candidates[0].score === candidates[1].score) return candidates[1].voice;
  return candidates[0].voice;
}
