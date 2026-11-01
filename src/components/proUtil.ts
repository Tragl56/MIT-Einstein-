// Utilitários de apresentação do OncoFlow Pro.

import { idiomaAtual, tr } from '../idioma';

const FUSO = 'America/Sao_Paulo';
const TITULO = /^(Dra?\.|Enf\.|Nurse)\s*/;

export function iniciais(nome: string): string {
  const partes = nome.replace(TITULO, '').split(' ').filter(Boolean);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

// "Dra. Camila Ribeiro" -> "Dra. Camila"; "Dr. Camila Ribeiro" -> "Dr. Ribeiro";
// "Nurse Rodrigo Mendes" -> "Rodrigo"; "Carla Menezes" -> "Carla"
export function nomeCurto(nome: string): string {
  if (idiomaAtual() === 'en-US') {
    if (/^Dra?\.\s/.test(nome)) return `Dr. ${nome.split(' ').slice(-1)[0]}`;
    return nome.replace(/^Nurse\s+/, '').split(' ')[0];
  }
  const titulo = nome.match(/^(Dra?|Enf)\.\s*/)?.[0] ?? '';
  return `${titulo}${nome.slice(titulo.length).split(' ')[0]}`;
}

// "Carcinoma de pulmão não pequenas células, estágio IV..." -> "Carcinoma de pulmão não pequenas células"
export function diagnosticoCurto(diagnostico: string): string {
  return diagnostico.split(/[,.]/)[0].trim();
}

export function saudacao(agora = new Date()): string {
  const hora = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: 'numeric', hourCycle: 'h23' }).format(agora));
  if (hora < 12) return tr('Bom dia', 'Good morning');
  if (hora < 18) return tr('Boa tarde', 'Good afternoon');
  return tr('Boa noite', 'Good evening');
}

// "Ter, 3 de novembro · 14h" | "Tue, Nov 3 · 2 PM"
export function dataCompromisso(iso: string): string {
  const d = new Date(iso);
  if (idiomaAtual() === 'en-US') {
    const semana = new Intl.DateTimeFormat('en-US', { timeZone: FUSO, weekday: 'short' }).format(d);
    const dia = new Intl.DateTimeFormat('en-US', { timeZone: FUSO, day: 'numeric', month: 'short' }).format(d);
    const p = new Intl.DateTimeFormat('en-US', { timeZone: FUSO, hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(d);
    const h = p.find((x) => x.type === 'hour')?.value ?? '';
    const m = p.find((x) => x.type === 'minute')?.value ?? '00';
    const periodo = p.find((x) => x.type === 'dayPeriod')?.value ?? '';
    return `${semana}, ${dia} · ${h}${m === '00' ? '' : `:${m}`} ${periodo}`;
  }
  const semana = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, weekday: 'short' }).format(d).replace('.', '');
  const dia = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: 'numeric', month: 'long' }).format(d);
  const p = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: 'numeric', minute: '2-digit' }).formatToParts(d);
  const h = p.find((x) => x.type === 'hour')?.value ?? '';
  const m = p.find((x) => x.type === 'minute')?.value ?? '00';
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)}, ${dia} · ${h}h${m === '00' ? '' : m}`;
}

export function dataHoraCurta(iso: string): string {
  return new Intl.DateTimeFormat(idiomaAtual(), {
    timeZone: FUSO,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
