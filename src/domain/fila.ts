import type { PacientePro, Pendencia, UsuarioEquipe } from '../types';

export type ItemFila = { pendencia: Pendencia; paciente: PacientePro };
export type FiltrosFila = { busca: string; estado: 'abertas' | 'concluidas' | 'todas'; responsavel: 'todos' | 'minhas' | 'sem_responsavel'; vencidas: boolean; somenteSinais: boolean };

export function itensFila(pacientes: PacientePro[]): ItemFila[] {
  return pacientes.flatMap(paciente => paciente.pendencias.map(pendencia => ({ paciente, pendencia })));
}

export function filtrarFila(itens: ItemFila[], filtros: FiltrosFila, usuario: UsuarioEquipe, agora: number): ItemFila[] {
  const busca = filtros.busca.trim().toLocaleLowerCase();
  return itens.filter(({ paciente, pendencia: p }) =>
    (!busca || `${paciente.nome} ${p.titulo}`.toLocaleLowerCase().includes(busca)) &&
    (filtros.estado === 'todas' || (filtros.estado === 'concluidas' ? p.estado === 'concluida' : p.estado !== 'concluida')) &&
    (filtros.responsavel === 'todos' || (filtros.responsavel === 'minhas' ? (p.responsavelId ? p.responsavelId === usuario.id : p.responsavel === usuario.nome) : !p.responsavel && !p.responsavelId)) &&
    (!filtros.vencidas || (p.estado !== 'concluida' && Date.parse(p.prazo) < agora)) &&
    (!filtros.somenteSinais || p.tipo === 'sinal_urgencia'),
  ).sort((a, b) => a.pendencia.prazo.localeCompare(b.pendencia.prazo) || a.pendencia.id.localeCompare(b.pendencia.id));
}

export function indicadoresFila(itens: ItemFila[], agora: number) {
  const abertas = itens.filter(({ pendencia: p }) => p.estado !== 'concluida');
  const tempos = itens.flatMap(({ pendencia: p }) => {
    const primeira = p.assumidaEm ?? p.concluidaEm;
    if (!primeira) return [];
    const ms = Date.parse(primeira) - Date.parse(p.criadaEm);
    return Number.isFinite(ms) && ms >= 0 ? [ms / 3_600_000] : [];
  });
  return {
    abertas: abertas.length,
    vencidas: abertas.filter(({ pendencia: p }) => Date.parse(p.prazo) < agora).length,
    semResponsavel: abertas.filter(({ pendencia: p }) => !p.responsavel && !p.responsavelId).length,
    concluidas7dias: itens.filter(({ pendencia: p }) => p.estado === 'concluida' && p.concluidaEm && Date.parse(p.concluidaEm) <= agora && Date.parse(p.concluidaEm) >= agora - 7 * 86_400_000).length,
    primeiraAcaoHoras: tempos.length ? tempos.reduce((s, n) => s + n, 0) / tempos.length : null,
    amostraTempo: tempos.length,
  };
}

export function csvFila(itens: ItemFila[]): string {
  const cell = (value: unknown) => {
    let text = String(value ?? '');
    if (/^[\s\uFEFF]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const rows: unknown[][] = [['ID', 'Paciente fictício', 'Tipo', 'Estado', 'Responsável', 'Equipe', 'Criada em', 'Prazo operacional', 'Concluída em']];
  for (const { paciente, pendencia: p } of itens) rows.push([p.id, paciente.nome, p.tipo, p.estado, p.responsavel, p.papelDestino, p.criadaEm, p.prazo, p.concluidaEm]);
  return '\uFEFF' + rows.map(row => row.map(cell).join(';')).join('\r\n');
}
