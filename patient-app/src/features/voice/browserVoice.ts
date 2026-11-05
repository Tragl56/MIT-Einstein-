type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};
type VoiceWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
const ctor = () =>
  (window as VoiceWindow).SpeechRecognition ??
  (window as VoiceWindow).webkitSpeechRecognition;
export function browserVoiceAvailable() {
  return !!ctor();
}
export function recognizeBrowser(
  locale: string,
  signal: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const Constructor = ctor();
    if (!Constructor) {
      reject(
        new Error(
          "Este navegador não oferece reconhecimento de voz. Abra no Chrome do Android ou digite.",
        ),
      );
      return;
    }
    if (signal.aborted) {
      reject(new DOMException("Cancelled", "AbortError"));
      return;
    }
    const recognition = new Constructor();
    recognition.lang = locale;
    recognition.continuous = false;
    recognition.interimResults = false;
    let settled = false;
    const finish = (text?: string, error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", aborted);
      recognition.onresult = recognition.onerror = recognition.onend = null;
      recognition.abort();
      if (error) reject(error);
      else if (text?.trim()) resolve(text.trim());
      else reject(new Error("Não entendi a fala. Tente novamente ou digite."));
    };
    const aborted = () =>
      finish(undefined, new DOMException("Cancelled", "AbortError"));
    const timer = setTimeout(() => finish(), 30_000);
    signal.addEventListener("abort", aborted, { once: true });
    recognition.onresult = (event) => finish(event.results[0]?.[0]?.transcript);
    recognition.onerror = (event) =>
      finish(
        undefined,
        new Error(
          event.error === "not-allowed"
            ? "O microfone não foi autorizado. Permita o acesso no navegador ou digite."
            : "Não foi possível reconhecer a fala. Tente novamente ou digite.",
        ),
      );
    recognition.onend = () => finish();
    try {
      recognition.start();
    } catch {
      finish(undefined, new Error("Não foi possível iniciar o microfone."));
    }
  });
}
// Lia's identity is a warm adult female voice. Browsers default to whatever the system lists first
// (on Windows pt-BR that is "Microsoft Daniel", a male voice), so the voice is chosen explicitly:
// neural voices first, then other known female voices, never a known male voice.
const FEMALE_VOICES: Record<"pt" | "en", RegExp[]> = {
  pt: [
    /(francisca|thalita).*natural/i,
    /francisca|thalita|google portugu[eê]s do brasil/i,
    /maria|luciana|vit[oó]ria|helo[ií]sa|leila|yara|female|feminina/i,
  ],
  en: [
    /(aria|jenny|ava|emma|michelle).*natural/i,
    /aria|jenny|ava|emma|michelle|google us english/i,
    /samantha|allison|susan|zira|hazel|female/i,
  ],
};
const MALE_VOICES =
  /daniel|ant[oô]nio|donato|f[aá]bio|humberto|j[uú]lio|val[eé]rio|nicolau|guy|davis|andrew|brian|christopher|eric|roger|steffan|david|mark|george|james|\bmale\b/i;

/** Lia speaks a little slower and slightly higher than the system default, to sound gentle. */
export const LIA_VOICE_PITCH = 1.1;
export const LIA_VOICE_PACE = 0.92;

type VoiceOption = Pick<SpeechSynthesisVoice, "name" | "lang">;
export function chooseLiaVoice<T extends VoiceOption>(
  voices: readonly T[],
  locale: string,
): T | undefined {
  const language = locale.toLowerCase().startsWith("en") ? "en" : "pt";
  const sameLanguage = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith(language),
  );
  const exact = (voice: T) =>
    voice.lang.toLowerCase() === locale.toLowerCase();
  for (const preferred of FEMALE_VOICES[language]) {
    const match =
      sameLanguage.find((voice) => exact(voice) && preferred.test(voice.name)) ??
      sameLanguage.find((voice) => preferred.test(voice.name));
    if (match) return match;
  }
  return (
    sameLanguage.find((voice) => exact(voice) && !MALE_VOICES.test(voice.name)) ??
    sameLanguage.find((voice) => !MALE_VOICES.test(voice.name))
  );
}

// Some browsers fill the voice list asynchronously after the first call.
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const ready = window.speechSynthesis.getVoices();
  if (ready.length) return Promise.resolve(ready);
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      window.speechSynthesis.removeEventListener?.("voiceschanged", done);
      resolve(window.speechSynthesis.getVoices?.() ?? []);
    };
    const timer = setTimeout(done, 1_000);
    window.speechSynthesis.addEventListener?.("voiceschanged", done);
  });
}

export async function speakBrowser(
  text: string,
  locale: string,
  rate: number,
  signal: AbortSignal,
): Promise<void> {
  if (!("speechSynthesis" in window) || signal.aborted) return;
  const voices =
    typeof window.speechSynthesis.getVoices === "function"
      ? await loadVoices()
      : [];
  if (signal.aborted) return;
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    utterance.rate = Math.max(0.5, rate * LIA_VOICE_PACE);
    utterance.pitch = LIA_VOICE_PITCH;
    const voice = chooseLiaVoice(voices, locale);
    if (voice) utterance.voice = voice;
    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
    };
    const finish = () => {
      cleanup();
      resolve();
    };
    const cancel = () => {
      window.speechSynthesis.cancel();
      finish();
    };
    const timer = setTimeout(cancel, 90_000);
    signal.addEventListener("abort", cancel, { once: true });
    utterance.onend = finish;
    utterance.onerror = () => {
      cleanup();
      reject(
        new Error("A reprodução de voz falhou. A resposta está no texto."),
      );
    };
    window.speechSynthesis.speak(utterance);
  });
}
