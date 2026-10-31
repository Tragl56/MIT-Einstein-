const FUSO = 'America/Sao_Paulo';

function partes(iso: string) {
  const data = new Date(iso);
  const semana = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, weekday: 'long' }).format(data);
  const diaMes = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: 'numeric', month: 'long' }).format(data);
  const p = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: 'numeric', minute: '2-digit' }).formatToParts(data);
  const hora = p.find((x) => x.type === 'hour')?.value ?? '';
  const minuto = p.find((x) => x.type === 'minute')?.value ?? '00';
  return { semana, diaMes, hora: `${hora}h${minuto === '00' ? '' : minuto}` };
}

// "Terça-feira"
export function diaDaSemana(iso: string): string {
  const { semana } = partes(iso);
  return semana.charAt(0).toUpperCase() + semana.slice(1);
}

// "3 de novembro, às 14h"
export function diaEHora(iso: string): string {
  const { diaMes, hora } = partes(iso);
  return `${diaMes}, às ${hora}`;
}

// "terça-feira, 3 de novembro, às 14h"
export function porExtenso(iso: string): string {
  const { semana, diaMes, hora } = partes(iso);
  return `${semana}, ${diaMes}, às ${hora}`;
}

export function dataCurta(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit' }).format(new Date(iso));
}
