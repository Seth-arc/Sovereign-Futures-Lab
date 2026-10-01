import { describe, expect, it } from "vitest";
import { ADVISOR_VOICE_PROFILES, advisorVoiceIsAcceptable, selectAdvisorVoice } from "./advisorVoice";

function voice(name: string, lang = "en-US", isDefault = false): SpeechSynthesisVoice {
  return { default: isDefault, lang, localService: true, name, voiceURI: name };
}

describe("advisor speech voices", () => {
  it("gives each advisor a distinct delivery profile", () => {
    expect(ADVISOR_VOICE_PROFILES.amara.rate).not.toBe(ADVISOR_VOICE_PROFILES.daniel.rate);
    expect(ADVISOR_VOICE_PROFILES.amara.pitch).toBe(1);
    expect(ADVISOR_VOICE_PROFILES.daniel.pitch).toBe(1);
  });

  it("selects different preferred installed voices for Amara and Daniel", () => {
    const voices = [voice("Microsoft Ryan Online (Natural)"), voice("Microsoft Sonia Online (Natural)")];

    expect(selectAdvisorVoice(voices, "amara")?.name).toBe("Microsoft Sonia Online (Natural)");
    expect(selectAdvisorVoice(voices, "daniel")?.name).toBe("Microsoft Ryan Online (Natural)");
  });

  it("prefers natural speech over a generic default voice", () => {
    const voices = [voice("Generic English", "en-US", true), voice("Microsoft Aria Online (Natural)")];

    expect(selectAdvisorVoice(voices, "amara")?.name).toBe("Microsoft Aria Online (Natural)");
  });

  it("rejects legacy, novelty, and non-English voices instead of playing them", () => {
    expect(advisorVoiceIsAcceptable(voice("Microsoft David Desktop"))).toBe(false);
    expect(advisorVoiceIsAcceptable(voice("Zarvox"))).toBe(false);
    expect(advisorVoiceIsAcceptable(voice("Natural French", "fr-FR"))).toBe(false);
    expect(selectAdvisorVoice([voice("Microsoft David Desktop"), voice("Zarvox")], "daniel")).toBeUndefined();
  });

  it("fails closed instead of playing unknown generic voices", () => {
    const voices = [voice("Voice Zebra"), voice("Voice Alpha")];

    expect(selectAdvisorVoice(voices, "amara")).toBeUndefined();
    expect(selectAdvisorVoice(voices, "daniel")).toBeUndefined();
  });
});
