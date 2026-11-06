import { afterEach, describe, expect, it, vi } from "vitest";
import { chooseLiaVoice, recognizeBrowser } from "../../src/features/voice/browserVoice";

type Mic = { permission: PermissionState; getUserMedia?: () => Promise<unknown>; secure?: boolean };
function browser({ permission, getUserMedia, secure = true }: Mic) {
  class Recognition {
    lang = ""; continuous = false; interimResults = false;
    onresult: ((e: unknown) => void) | null = null; onerror = null; onend = null;
    start() { setTimeout(() => this.onresult?.({ results: [[{ transcript: "leia minha agenda" }]] }), 0); }
    abort() {}
  }
  vi.stubGlobal("window", { isSecureContext: secure, webkitSpeechRecognition: Recognition });
  vi.stubGlobal("navigator", {
    permissions: { query: async () => ({ state: permission }) },
    mediaDevices: getUserMedia ? { getUserMedia } : undefined,
  });
}
const denied = (name: string) => async () => { throw Object.assign(new Error(name), { name }); };
const stream = async () => ({ getTracks: () => [{ stop() {} }] });

describe("Lia browser microphone", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("listens once the microphone is allowed", async () => {
    browser({ permission: "granted", getUserMedia: stream });
    await expect(recognizeBrowser("pt-BR", new AbortController().signal)).resolves.toBe("leia minha agenda");
  });

  it("explains a site block without asking again", async () => {
    const getUserMedia = vi.fn(stream);
    browser({ permission: "denied", getUserMedia });
    await expect(recognizeBrowser("pt-BR", new AbortController().signal)).rejects.toThrow(/bloqueado para este site/);
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("points to Windows when the site is allowed but capture is refused", async () => {
    browser({ permission: "granted", getUserMedia: denied("NotAllowedError") });
    await expect(recognizeBrowser("pt-BR", new AbortController().signal)).rejects.toThrow(/Privacidade > Microfone/);
  });

  it("says when there is no microphone, in English too", async () => {
    browser({ permission: "prompt", getUserMedia: denied("NotFoundError") });
    await expect(recognizeBrowser("en-US", new AbortController().signal)).rejects.toThrow(/No microphone was found/);
  });

  it("asks for a secure address when the page is not one", async () => {
    browser({ permission: "prompt", getUserMedia: stream, secure: false });
    await expect(recognizeBrowser("pt-BR", new AbortController().signal)).rejects.toThrow(/localhost:3000/);
  });
});

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
