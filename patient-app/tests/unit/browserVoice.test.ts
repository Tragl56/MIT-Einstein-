import { describe, expect, it } from "vitest";
import { chooseLiaVoice } from "../../src/features/voice/browserVoice";

const voice = (name: string, lang: string) => ({ name, lang });

describe("Lia browser voice", () => {
  it("skips the Windows default male pt-BR voice for Maria", () => {
    const voices = [
      voice("Microsoft Daniel - Portuguese (Brazil)", "pt-BR"),
      voice("Microsoft Maria - Portuguese (Brazil)", "pt-BR"),
    ];
    expect(chooseLiaVoice(voices, "pt-BR")?.name).toContain("Maria");
  });

  it("prefers a neural female voice when the browser offers one", () => {
    const voices = [
      voice("Microsoft Maria - Portuguese (Brazil)", "pt-BR"),
      voice("Google português do Brasil", "pt-BR"),
      voice("Microsoft Francisca Online (Natural) - Portuguese (Brazil)", "pt-BR"),
    ];
    expect(chooseLiaVoice(voices, "pt-BR")?.name).toContain("Francisca");
  });

  it("uses a female voice in English too", () => {
    const voices = [
      voice("Microsoft David - English (United States)", "en-US"),
      voice("Microsoft Zira - English (United States)", "en-US"),
      voice("Microsoft Maria - Portuguese (Brazil)", "pt-BR"),
    ];
    expect(chooseLiaVoice(voices, "en-US")?.name).toContain("Zira");
  });

  it("never falls back to a known male voice", () => {
    const voices = [
      voice("Microsoft Daniel - Portuguese (Brazil)", "pt-BR"),
      voice("Microsoft Antonio Online (Natural) - Portuguese (Brazil)", "pt-BR"),
    ];
    expect(chooseLiaVoice(voices, "pt-BR")).toBeUndefined();
  });

  it("accepts an unknown voice in the language rather than none", () => {
    const voices = [voice("Daniel", "pt-BR"), voice("Voz do sistema", "pt-BR")];
    expect(chooseLiaVoice(voices, "pt-BR")?.name).toBe("Voz do sistema");
  });
});
