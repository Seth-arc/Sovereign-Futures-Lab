import type { AdvisorId } from "./types";

export type AdvisorVoiceProfile = {
  rate: number;
  pitch: number;
  preferredNameFragments: readonly string[];
};

export const ADVISOR_VOICE_PROFILES: Record<AdvisorId, AdvisorVoiceProfile> = {
  amara: {
    rate: 0.96,
    pitch: 1.08,
    preferredNameFragments: ["aria", "samantha", "victoria", "zira", "sonia", "serena", "hazel", "susan"],
  },
  daniel: {
    rate: 0.91,
    pitch: 0.88,
    preferredNameFragments: ["guy", "david", "mark", "george", "james", "daniel", "ryan"],
  },
};

/**
 * Browser voice catalogues differ by operating system. Prefer a recognisable
 * English voice for each advisor, then fall back to two different voices from
 * the stable, sorted catalogue whenever at least two are available.
 */
export function selectAdvisorVoice(
  voices: readonly SpeechSynthesisVoice[],
  advisorId: AdvisorId,
): SpeechSynthesisVoice | undefined {
  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  const candidates = [...(englishVoices.length ? englishVoices : voices)].sort((left, right) =>
    `${left.lang}|${left.name}|${left.voiceURI}`.localeCompare(`${right.lang}|${right.name}|${right.voiceURI}`),
  );
  const preferred = ADVISOR_VOICE_PROFILES[advisorId].preferredNameFragments;
  const preferredVoice = candidates.find((voice) => {
    const name = voice.name.toLowerCase();
    return preferred.some((fragment) => name.includes(fragment));
  });

  if (preferredVoice) return preferredVoice;
  if (advisorId === "daniel" && candidates.length > 1) return candidates[1];
  return candidates[0];
}
