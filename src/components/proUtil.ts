// Utilitários de apresentação do OncoFlow Pro.

const FUSO = 'America/Sao_Paulo';

export function iniciais(nome: string): string {
  const partes = nome.replace(/^(Dra?|Enf)\.\s*/, '').split(' ').filter(Boolean);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

// "Dra. Camila Ribeiro" -> "Dra. Camila"; "Carla Menezes" -> "Carla"
export function nomeCurto(nome: string): string {
  const titulo = nome.match(/^(Dra?|Enf)\.\s*/)?.[0] ?? '';
  return `${titulo}${nome.slice(titulo.length).split(' ')[0]}`;
}

// "Carcinoma de pulmão não pequenas células, estágio IV..." -> "Carcinoma de pulmão não pequenas células"
export function diagnosticoCurto(diagnostico: string): string {
  return diagnostico.split(/[,.]/)[0].trim();
}

export function saudacao(agora = new Date()): string {
  const hora = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: 'numeric', hourCycle: 'h23' }).format(agora));
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

// "Ter, 3 de nov · 14h"
export function dataCompromisso(iso: string): string {
  const d = new Date(iso);
  const semana = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, weekday: 'short' }).format(d).replace('.', '');
  const dia = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: 'numeric', month: 'long' }).format(d);
  const p = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: 'numeric', minute: '2-digit' }).formatToParts(d);
  const h = p.find((x) => x.type === 'hour')?.value ?? '';
  const m = p.find((x) => x.type === 'minute')?.value ?? '00';
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)}, ${dia} · ${h}h${m === '00' ? '' : m}`;
}

export function dataHoraCurta(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
