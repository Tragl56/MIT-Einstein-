import type { ItemFila } from './fila';
import type { UsuarioEquipe } from '../types';

const diaMs = 86_400_000;
const dataSP = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
export function diaSaoPaulo(timestamp: number): string { return dataSP.format(timestamp); }

/** Current workload and recorded events; never reconstruct historical assignments or deadlines. */
export function relatorioFila(itens: ItemFila[], usuarios: UsuarioEquipe[], agora: number, dias: 7 | 30) {
  const hoje = diaSaoPaulo(agora);
  // Shift calendar dates in UTC, then use only the date portion (not a fabricated local midnight).
  const calendario = Array.from({ length: dias }, (_, i) => new Date(Date.parse(`${hoje}T12:00:00Z`) - (dias - 1 - i) * diaMs).toISOString().slice(0, 10));
  const serie = calendario.map(dia => ({ dia, criadas: 0, concluidas: 0 }));
  const porDia = new Map(serie.map(d => [d.dia, d]));
  const usuariosPorId = new Map(usuarios.map(u => [u.id, u]));
  const usuariosPorNome = new Map(usuarios.map(u => [u.nome, u]));
  const equipes = new Map<string, { id: string; nome: string; abertas: number; vencidas: number; atrasoMaximoHoras: number; concluidas: number }>();
  const duracoes: number[] = [];
  let datasInvalidas = 0;
  let conclusoesSemDuracao = 0;
  for (const { pendencia: p } of itens) {
    const criada = Date.parse(p.criadaEm);
    const concluida = p.estado === 'concluida' && p.concluidaEm ? Date.parse(p.concluidaEm) : NaN;
    const entrada = Number.isFinite(criada) && criada <= agora ? porDia.get(diaSaoPaulo(criada)) : undefined;
    const saida = Number.isFinite(concluida) && concluida <= agora ? porDia.get(diaSaoPaulo(concluida)) : undefined;
    if (entrada) entrada.criadas++;
    if (saida) {
      saida.concluidas++;
      if (Number.isFinite(criada) && criada <= concluida) duracoes.push((concluida - criada) / 3_600_000);
      else conclusoesSemDuracao++;
    }
    if (!Number.isFinite(criada) || criada > agora || (p.estado === 'concluida' && (!Number.isFinite(concluida) || concluida > agora || concluida < criada))) datasInvalidas++;
    if (p.estado === 'concluida' && !saida) continue;
    const usuario = p.responsavelId ? usuariosPorId.get(p.responsavelId) : usuariosPorNome.get(p.responsavel ?? '');
    const id = p.responsavelId ?? usuario?.id ?? (p.responsavel ? `legado:${p.responsavel}` : 'sem-responsavel');
    const nome = usuario?.nome ?? p.responsavel ?? p.responsavelId ?? null;
    const linha = equipes.get(id) ?? { id, nome: nome ?? '', abertas: 0, vencidas: 0, atrasoMaximoHoras: 0, concluidas: 0 };
    if (p.estado !== 'concluida') {
      linha.abertas++;
      const prazo = Date.parse(p.prazo);
      if (Number.isFinite(prazo) && prazo < agora) { linha.vencidas++; linha.atrasoMaximoHoras = Math.max(linha.atrasoMaximoHoras, (agora - prazo) / 3_600_000); }
    } else linha.concluidas++;
    equipes.set(id, linha);
  }
  duracoes.sort((a, b) => a - b);
  const meio = Math.floor(duracoes.length / 2);
  const medianaHoras = duracoes.length ? (duracoes[meio] + duracoes[Math.floor((duracoes.length - 1) / 2)]) / 2 : null;
  return { inicio: calendario[0], fim: hoje, serie, equipes: [...equipes.values()].sort((a, b) => b.vencidas - a.vencidas || b.abertas - a.abertas || a.id.localeCompare(b.id)), criadas: serie.reduce((s, d) => s + d.criadas, 0), concluidas: serie.reduce((s, d) => s + d.concluidas, 0), medianaHoras, amostra: duracoes.length, datasInvalidas, conclusoesSemDuracao };
}
