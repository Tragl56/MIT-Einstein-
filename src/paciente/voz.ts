// Voz no app do paciente: gravação em push-to-talk (o áudio vai para transcrição e não é guardado)
// e leitura em voz alta com o sintetizador do navegador, como reserva até haver um TTS neural pt-BR.

import { useCallback, useEffect, useRef, useState } from 'react';

export interface AudioGravado {
  base64: string;
  mimeType: string;
}

function mimeSuportado(): string | undefined {
  const candidatos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidatos.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m));
}

function paraBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result).split(',')[1] ?? '');
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsDataURL(blob);
  });
}

export function useGravador() {
  const [gravando, setGravando] = useState(false);
  const gravador = useRef<MediaRecorder | null>(null);
  const partes = useRef<Blob[]>([]);
  const fluxo = useRef<MediaStream | null>(null);

  const liberar = () => {
    fluxo.current?.getTracks().forEach((t) => t.stop());
    fluxo.current = null;
    gravador.current = null;
    setGravando(false);
  };

  const iniciar = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return false;
    try {
      fluxo.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = mimeSuportado();
      const rec = new MediaRecorder(fluxo.current, mime ? { mimeType: mime } : undefined);
      partes.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && partes.current.push(e.data);
      rec.start();
      gravador.current = rec;
      setGravando(true);
      return true;
    } catch {
      liberar();
      return false;
    }
  }, []);

  const parar = useCallback(async (): Promise<AudioGravado | null> => {
    const rec = gravador.current;
    if (!rec) return null;
    const mimeType = rec.mimeType || 'audio/webm';
    await new Promise<void>((resolve) => {
      rec.onstop = () => resolve();
      rec.stop();
    });
    liberar();
    const blob = new Blob(partes.current, { type: mimeType });
    partes.current = [];
    if (blob.size === 0) return null;
    return { base64: await paraBase64(blob), mimeType };
  }, []);

  const cancelar = useCallback(() => {
    gravador.current?.stop();
    partes.current = [];
    liberar();
  }, []);

  useEffect(() => cancelar, [cancelar]);

  return { gravando, iniciar, parar, cancelar };
}

function escolherVoz(): SpeechSynthesisVoice | undefined {
  const vozes = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('pt'));
  const preferidas = /francisca|maria|luciana|thalita|vit[oó]ria|female|feminina|google portugu[eê]s do brasil/i;
  return vozes.find((v) => v.lang === 'pt-BR' && preferidas.test(v.name)) ?? vozes.find((v) => v.lang === 'pt-BR') ?? vozes[0];
}

export function useFala() {
  const disponivel = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [falando, setFalando] = useState(false);

  const falar = useCallback(
    (texto: string, velocidade = 1) => {
      if (!disponivel || !texto) return;
      window.speechSynthesis.cancel();
      const fala = new SpeechSynthesisUtterance(texto);
      fala.lang = 'pt-BR';
      fala.rate = velocidade;
      const voz = escolherVoz();
      if (voz) fala.voice = voz;
      fala.onstart = () => setFalando(true);
      fala.onend = () => setFalando(false);
      fala.onerror = () => setFalando(false);
      window.speechSynthesis.speak(fala);
    },
    [disponivel]
  );

  const parar = useCallback(() => {
    if (!disponivel) return;
    window.speechSynthesis.cancel();
    setFalando(false);
  }, [disponivel]);

  useEffect(() => parar, [parar]);

  return { disponivel, falando, falar, parar };
}
