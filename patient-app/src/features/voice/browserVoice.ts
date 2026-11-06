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
const say = (locale: string, pt: string, en: string) =>
  locale.toLowerCase().startsWith("en") ? en : pt;

/** Explains why the microphone is unavailable, with the step that fixes it. */
export function microphoneProblem(
  locale: string,
  cause: "insecure" | "blocked-by-site" | "blocked-by-system" | "missing",
): string {
  switch (cause) {
    case "insecure":
      return say(locale,
        "O navegador só libera o microfone em endereço seguro. Abra pelo http://localhost:3000/app/ neste computador ou por um endereço https, ou digite.",
        "The browser only allows the microphone on a secure address. Open http://localhost:3000/app/ on this computer or an https address, or type.");
    case "blocked-by-site":
      return say(locale,
        "O microfone está bloqueado para este site. Clique no ícone à esquerda do endereço, escolha Microfone: Permitir e recarregue a página. Você também pode digitar.",
        "The microphone is blocked for this site. Click the icon left of the address, set Microphone to Allow and reload the page. You can also type.");
    case "blocked-by-system":
      return say(locale,
        "O sistema não liberou o microfone para o navegador. No Windows, abra Configurações > Privacidade > Microfone e permita o acesso dos aplicativos da área de trabalho. Você também pode digitar.",
        "The system did not give the browser the microphone. On Windows, open Settings > Privacy > Microphone and allow desktop apps. You can also type.");
    case "missing":
      return say(locale,
        "Nenhum microfone foi encontrado. Conecte um microfone ou digite.",
        "No microphone was found. Connect one or type.");
  }
}

async function microphonePermission(): Promise<PermissionState | "unknown"> {
  try {
    const status = await navigator.permissions?.query({
      name: "microphone" as PermissionName,
    });
    return status?.state ?? "unknown";
  } catch {
    return "unknown";
  }
}

// Asking for the microphone first makes the browser show its "Allow microphone" prompt and tells
// the patient which block to undo. The stream is closed at once: nothing is recorded here.
async function ensureMicrophone(locale: string): Promise<void> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
    throw new Error(microphoneProblem(locale, "insecure"));
  if ((await microphonePermission()) === "denied")
    throw new Error(microphoneProblem(locale, "blocked-by-site"));
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
  } catch (error) {
    const name = (error as { name?: string })?.name;
    if (name === "NotFoundError" || name === "OverconstrainedError")
      throw new Error(microphoneProblem(locale, "missing"));
    // Denied by the site prompt shows as "denied"; otherwise the operating system refused it.
    throw new Error(
      microphoneProblem(
        locale,
        (await microphonePermission()) === "granted" ? "blocked-by-system" : "blocked-by-site",
      ),
    );
  }
}

export async function recognizeBrowser(
  locale: string,
  signal: AbortSignal,
): Promise<string> {
  if (!ctor())
    throw new Error(
      say(locale,
        "Este navegador não oferece reconhecimento de voz. Use o Chrome ou o Edge, ou digite.",
        "This browser has no speech recognition. Use Chrome or Edge, or type."),
    );
  await ensureMicrophone(locale);
  if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
  return listen(locale, signal);
}

function listen(locale: string, signal: AbortSignal): Promise<string> {
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
          event.error === "not-allowed" || event.error === "audio-capture"
            ? // The microphone itself was just allowed above, so the block is in the system.
              microphoneProblem(locale, "blocked-by-system")
            : event.error === "network" || event.error === "service-not-allowed"
              ? say(locale,
                  "O reconhecimento de fala do navegador precisa de internet e não respondeu. Verifique a conexão ou digite.",
                  "The browser's speech recognition needs the internet and did not answer. Check the connection or type.")
              : say(locale,
                  "Não foi possível reconhecer a fala. Tente novamente ou digite.",
                  "Speech could not be recognized. Try again or type."),
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
