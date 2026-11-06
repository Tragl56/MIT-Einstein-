// Controles de segurança do servidor da demo. Não substituem autenticação real (skill
// oncoflow-seguranca-lgpd): reduzem a exposição enquanto a identidade ainda é de demonstração.

import type { NextFunction, Request, Response } from 'express';
import { ErroDominio } from './estado';
import { tr } from '../src/idioma';

/** Cabeçalhos que valem para qualquer resposta: páginas, API e arquivos. */
export function cabecalhosSeguranca(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // Nenhum outro site pode exibir o OncoFlow dentro de um quadro (clickjacking).
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'");
  // Microfone e câmera só para a própria página; o resto fica desligado.
  res.setHeader('Permissions-Policy', 'microphone=(self), camera=(self), geolocation=(), payment=(), usb=(), interest-cohort=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  next();
}

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
export function doProprioComputador(req: Request) {
  // Endereço do socket, não X-Forwarded-For: o servidor local não fica atrás de proxy.
  return LOOPBACK.has(req.socket.remoteAddress ?? '');
}

/**
 * A identidade da equipe e a sessão do paciente da demo são fixas (`x-demo-usuario`, `demo-maria`).
 * Quando o servidor local é aberto na rede para o celular, outra pessoa no mesmo Wi-Fi poderia usar
 * esses valores. Estas rotas só respondem a este computador; o app do celular usa /api/mobile e
 * /api/v1, que têm pareamento e sessão próprios.
 */
export function rotaSomenteLocal(req: Request) {
  const caminho = req.path;
  if (caminho === '/api/demo/idioma' && req.method === 'GET') return false; // só lê o idioma
  if (caminho.startsWith('/api/mobile/') && caminho.includes('/lia-worker/')) return false; // tem token próprio
  return ['/api/pro/', '/api/demo/', '/api/paciente/', '/api/transcrever-audio'].some(p => caminho === p.replace(/\/$/, '') || caminho.startsWith(p));
}

export function protegerRotasLocais(req: Request, res: Response, next: NextFunction) {
  if (rotaSomenteLocal(req) && !doProprioComputador(req)) {
    res.status(403).json({ erro: 'somente_local', mensagem: tr('Esta área da demonstração só abre no computador que roda o servidor.', 'This part of the demo only opens on the computer running the server.') });
    return;
  }
  next();
}

/** Limite simples por janela fixa, em memória. Suficiente para um único processo de demo. */
export function limitarTaxa(nome: string, max: number, janelaMs: number, chave: (req: Request) => string) {
  const contagens = new Map<string, { inicio: number; total: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const agora = Date.now();
    const id = `${nome}:${chave(req)}`;
    const atual = contagens.get(id);
    if (!atual || agora - atual.inicio >= janelaMs) contagens.set(id, { inicio: agora, total: 1 });
    else if (++atual.total > max) {
      res.setHeader('Retry-After', String(Math.ceil((atual.inicio + janelaMs - agora) / 1000)));
      res.status(429).json({ erro: 'limite_requisicoes', mensagem: tr('Muitas tentativas seguidas. Aguarde um pouco e tente de novo.', 'Too many attempts in a row. Wait a moment and try again.') });
      return;
    }
    if (contagens.size > 5000) for (const [k, v] of contagens) if (agora - v.inicio >= janelaMs) contagens.delete(k);
    next();
  };
}

export const MIME_AUDIO_PERMITIDOS = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac'] as const;
export const AUDIO_MAX_BYTES = 8 * 1024 * 1024;

/** Valida o áudio antes de enviá-lo ao fornecedor de transcrição. Devolve o tipo limpo. */
export function validarAudio(audioBase64: unknown, mimeType: unknown): string {
  if (typeof audioBase64 !== 'string' || !audioBase64)
    throw new ErroDominio(400, 'audio_invalido', tr('audioBase64 é obrigatório', 'audioBase64 is required'));
  const tipo = (typeof mimeType === 'string' && mimeType ? mimeType : 'audio/webm').split(';')[0].trim().toLowerCase();
  if (!(MIME_AUDIO_PERMITIDOS as readonly string[]).includes(tipo))
    throw new ErroDominio(415, 'formato_audio', tr('Formato de áudio não aceito.', 'Audio format not accepted.'));
  if (audioBase64.length > Math.ceil(AUDIO_MAX_BYTES / 3) * 4)
    throw new ErroDominio(413, 'audio_grande', tr('Áudio longo demais. Fale uma frase mais curta.', 'Audio too long. Say a shorter sentence.'));
  if (audioBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audioBase64))
    throw new ErroDominio(400, 'audio_invalido', tr('Áudio em formato inválido.', 'Invalid audio encoding.'));
  return tipo;
}

/** Endereço em que o servidor local escuta: só este computador, salvo pedido explícito. */
export function hostDoServidor(env: NodeJS.ProcessEnv = process.env) {
  return env.ONCOFLOW_REDE_LOCAL === 'true' ? '0.0.0.0' : '127.0.0.1';
}
