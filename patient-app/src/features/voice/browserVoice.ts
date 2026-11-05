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
export function speakBrowser(
  text: string,
  locale: string,
  rate: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window) || signal.aborted) {
      resolve();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    utterance.rate = rate;
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
