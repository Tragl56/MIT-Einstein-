import { idiomaAtual, tr } from '../idioma';

const FUSO = 'America/Sao_Paulo';

function partes(iso: string) {
  const data = new Date(iso);
  const idioma = idiomaAtual();
  const semana = new Intl.DateTimeFormat(idioma, { timeZone: FUSO, weekday: 'long' }).format(data);
  const diaMes = new Intl.DateTimeFormat(idioma, { timeZone: FUSO, day: 'numeric', month: 'long' }).format(data);
  if (idioma === 'en-US') {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: FUSO, hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(data);
    const hora = p.find((x) => x.type === 'hour')?.value ?? '';
    const minuto = p.find((x) => x.type === 'minute')?.value ?? '00';
    const periodo = p.find((x) => x.type === 'dayPeriod')?.value ?? '';
    return { semana, diaMes, hora: `${hora}${minuto === '00' ? '' : `:${minuto}`} ${periodo}` };
  }
  const p = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: 'numeric', minute: '2-digit' }).formatToParts(data);
  const hora = p.find((x) => x.type === 'hour')?.value ?? '';
  const minuto = p.find((x) => x.type === 'minute')?.value ?? '00';
  return { semana, diaMes, hora: `${hora}h${minuto === '00' ? '' : minuto}` };
}

// "Terça-feira" | "Tuesday"
export function diaDaSemana(iso: string): string {
  const { semana } = partes(iso);
  return semana.charAt(0).toUpperCase() + semana.slice(1);
}

// "3 de novembro, às 14h" | "November 3, at 2 PM"
export function diaEHora(iso: string): string {
  const { diaMes, hora } = partes(iso);
  return tr(`${diaMes}, às ${hora}`, `${diaMes}, at ${hora}`);
}

// "terça-feira, 3 de novembro, às 14h" | "Tuesday, November 3, at 2 PM"
export function porExtenso(iso: string): string {
  const { semana, diaMes, hora } = partes(iso);
  return tr(`${semana}, ${diaMes}, às ${hora}`, `${semana}, ${diaMes}, at ${hora}`);
}

export function dataCurta(iso: string): string {
  return new Intl.DateTimeFormat(idiomaAtual(), { timeZone: FUSO, day: '2-digit', month: '2-digit' }).format(new Date(iso));
}
