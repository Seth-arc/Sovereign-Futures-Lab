import { describe, expect, it } from "vitest";
import { ADVISOR_VOICE_PROFILES, selectAdvisorVoice } from "./advisorVoice";

function voice(name: string, lang = "en-US"): SpeechSynthesisVoice {
  return { default: false, lang, localService: true, name, voiceURI: name };
}

describe("advisor speech voices", () => {
  it("gives each advisor a distinct delivery profile", () => {
    expect(ADVISOR_VOICE_PROFILES.amara.rate).not.toBe(ADVISOR_VOICE_PROFILES.daniel.rate);
    expect(ADVISOR_VOICE_PROFILES.amara.pitch).not.toBe(ADVISOR_VOICE_PROFILES.daniel.pitch);
  });

  it("selects different preferred installed voices for Amara and Daniel", () => {
    const voices = [voice("Microsoft David"), voice("Microsoft Aria")];

    expect(selectAdvisorVoice(voices, "amara")?.name).toBe("Microsoft Aria");
    expect(selectAdvisorVoice(voices, "daniel")?.name).toBe("Microsoft David");
  });

  it("uses different deterministic fallbacks when two unknown voices exist", () => {
    const voices = [voice("Voice Zebra"), voice("Voice Alpha")];

    expect(selectAdvisorVoice(voices, "amara")?.name).toBe("Voice Alpha");
    expect(selectAdvisorVoice(voices, "daniel")?.name).toBe("Voice Zebra");
  });
});
