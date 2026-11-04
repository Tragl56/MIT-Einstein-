import React, { useEffect, useMemo, useState } from 'react';
import type { EstadoPro, UsuarioEquipe } from '../types';
import type { AcoesPro } from '../api/pro';
import { PendenciaItem } from './Pendencias';
import { GestaoPendencia } from './GestaoPendencia';
import { csvFila, filtrarFila, indicadoresFila, itensFila, type FiltrosFila } from '../domain/fila';
import { tr } from '../idioma';

interface Props { estado: EstadoPro; acoes: AcoesPro; usuarioAtual: UsuarioEquipe; somenteSinais: boolean; onAlternarFiltro: (value: boolean) => void }
export const PaginaPendencias: React.FC<Props> = ({ estado, acoes, usuarioAtual, somenteSinais, onAlternarFiltro }) => {
  const [agora, setAgora] = useState(Date.now());
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState<FiltrosFila['estado']>('abertas');
  const [responsavel, setResponsavel] = useState<FiltrosFila['responsavel']>('todos');
  const [vencidas, setVencidas] = useState(false);
  useEffect(() => { const timer = setInterval(() => setAgora(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  const todos = useMemo(() => itensFila(estado.pacientes), [estado]);
  const indicadores = indicadoresFila(todos, agora);
  const itens = filtrarFila(todos, { busca, estado: situacao, responsavel, vencidas, somenteSinais }, usuarioAtual, agora);
  const campo = 'min-h-11 min-w-0 rounded-lg border border-linha bg-white px-3';
  function exportar() {
    const url = URL.createObjectURL(new Blob([csvFila(itens)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'oncoflow-fila-demonstracao.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function limpar() { setBusca(''); setSituacao('abertas'); setResponsavel('todos'); setVencidas(false); onAlternarFiltro(false); }
  return <section className="space-y-5" aria-label={tr('Fila de navegação', 'Navigation work queue')}>
    <div className="flex flex-wrap justify-between items-start gap-3"><div><h2 className="text-xl font-semibold text-azul">{tr('Fila de navegação', 'Navigation work queue')}</h2><p className="mt-1 text-sm text-tinta-suave">{tr('Responsáveis, prazos operacionais e histórico da equipe.', 'Team assignments, operational deadlines and work history.')}</p></div><button onClick={exportar} type="button" disabled={!itens.length} className={`${campo} font-semibold disabled:opacity-40`}>{tr('Exportar filtro CSV', 'Export filtered CSV')}</button></div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3" aria-label={tr('Indicadores da unidade', 'Unit metrics')}>
      {[[indicadores.abertas, tr('Abertas', 'Open')], [indicadores.vencidas, tr('Prazo vencido', 'Overdue')], [indicadores.semResponsavel, tr('Sem responsável', 'Unassigned')], [indicadores.concluidas7dias, tr('Concluídas em 7 dias', 'Closed in 7 days')]].map(([n, label]) => <div key={label} className="rounded-xl border border-linha bg-white p-4"><span className="block text-2xl font-bold tabular-nums">{n}</span><span className="text-sm text-tinta-suave">{label}</span></div>)}
    </div>
    <p className="text-sm text-tinta-suave">{tr('Tempo médio até primeira ação registrada:', 'Average time to first recorded action:')} <strong>{indicadores.primeiraAcaoHoras === null ? tr('sem amostra', 'no sample') : `${indicadores.primeiraAcaoHoras.toFixed(1)} h`}</strong> · {indicadores.amostraTempo} {tr('itens com datas disponíveis. Indicadores da unidade; não representam resposta clínica ou desfecho assistencial.', 'items with available timestamps. Unit metrics, not clinical response or patient outcomes.')}</p>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 rounded-xl border border-linha bg-white p-4">
      <label className="grid gap-1 text-sm font-medium">{tr('Buscar nesta fila', 'Search this queue')}<input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder={tr('Paciente ou pendência', 'Patient or pending item')} className={campo} /></label>
      <label className="grid gap-1 text-sm font-medium">{tr('Situação', 'Status')}<select value={situacao} onChange={e => { setSituacao(e.target.value as FiltrosFila['estado']); if (e.target.value === 'concluidas') setVencidas(false); }} className={campo}><option value="abertas">{tr('Abertas e em andamento', 'Open and in progress')}</option><option value="concluidas">{tr('Concluídas', 'Completed')}</option><option value="todas">{tr('Todas', 'All')}</option></select></label>
      <label className="grid gap-1 text-sm font-medium">{tr('Responsabilidade', 'Assignment')}<select value={responsavel} onChange={e => setResponsavel(e.target.value as FiltrosFila['responsavel'])} className={campo}><option value="todos">{tr('Toda a equipe', 'Entire team')}</option><option value="minhas">{tr('Minhas pendências', 'My items')}</option><option value="sem_responsavel">{tr('Sem responsável', 'Unassigned')}</option></select></label>
      <div className="grid gap-2 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={somenteSinais} onChange={e => onAlternarFiltro(e.target.checked)} />{tr('Somente sinais encaminhados', 'Forwarded signs only')}</label><label className="flex items-center gap-2"><input type="checkbox" checked={vencidas} disabled={situacao === 'concluidas'} onChange={e => setVencidas(e.target.checked)} />{tr('Somente prazos vencidos', 'Overdue only')}</label></div>
    </div>
    <p className="text-sm text-tinta-suave">{tr('Prazos são operacionais; prioridade clínica depende da avaliação da equipe. Regras de demonstração:', 'Deadlines are operational; clinical priority requires team assessment. Demo rules:')} {estado.regrasRevisao.map(r => r.descricao).join(' · ')}.</p>
    <p role="status" className="text-sm font-medium">{itens.length} {itens.length === 1 ? tr('pendência no filtro atual', 'item in the current filter') : tr('pendências no filtro atual', 'items in the current filter')}</p>
    {!itens.length ? <div className="rounded-xl bg-white border border-linha p-6 text-center"><p>{tr('Nenhuma pendência corresponde aos filtros.', 'No items match these filters.')}</p><button type="button" className="min-h-11 underline mt-2" onClick={limpar}>{tr('Limpar filtros', 'Clear filters')}</button></div> : <div className="space-y-4">{itens.map(({ pendencia, paciente }) => <div key={pendencia.id} className="rounded-xl border border-linha bg-white p-3 sm:p-4 space-y-3"><PendenciaItem pendencia={pendencia} nomePaciente={paciente.nome} onAssumir={acoes.assumirPendencia} onConcluir={acoes.concluirPendencia} /><GestaoPendencia pendencia={pendencia} usuarios={estado.usuarios} onSalvar={acoes.gerenciarPendencia} /></div>)}</div>}
  </section>;
};
