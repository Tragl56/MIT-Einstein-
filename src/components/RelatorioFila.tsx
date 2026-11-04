import React, { useState } from 'react';
import { relatorioFila } from '../domain/relatorioFila';
import type { ItemFila } from '../domain/fila';
import type { UsuarioEquipe } from '../types';
import { tr } from '../idioma';

const data = (iso: string) => iso.split('-').reverse().join('/');
export function RelatorioFila({ itens, usuarios, agora }: { itens: ItemFila[]; usuarios: UsuarioEquipe[]; agora: number }) {
  const [dias, setDias] = useState<7 | 30>(7);
  const r = relatorioFila(itens, usuarios, agora, dias);
  return <details className="rounded-xl border border-linha bg-white p-4">
    <summary className="min-h-11 cursor-pointer font-semibold text-azul">{tr('Relatório operacional da equipe', 'Team operations report')} · {tr('Dados fictícios', 'Fictional data')}</summary>
    <div className="space-y-4 mt-3">
      <label className="flex flex-wrap items-center gap-2 text-sm font-medium">{tr('Período de atividade', 'Activity period')}<select className="min-h-11 rounded-lg border border-linha px-3" value={dias} onChange={e => setDias(Number(e.target.value) as 7 | 30)}><option value={7}>{tr('7 dias', '7 days')}</option><option value={30}>{tr('30 dias', '30 days')}</option></select></label>
      <p className="text-sm text-tinta-suave">{data(r.inicio)} – {data(r.fim)} · America/Sao_Paulo · {tr('Hoje até o horário da atualização. Relatório da unidade inteira, independente dos filtros da fila.', 'Today through the update time. Entire unit, independent of queue filters.')}</p>
      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <p><strong className="block text-xl">{r.criadas}</strong>{tr('Criadas no período', 'Created in period')}</p>
        <p><strong className="block text-xl">{r.concluidas}</strong>{tr('Concluídas no período', 'Completed in period')}</p>
        <p><strong className="block text-xl">{r.medianaHoras === null ? tr('Sem amostra', 'No sample') : `${r.medianaHoras.toFixed(1)} h`}</strong>{tr('Mediana da criação à conclusão', 'Median creation to completion')} · n={r.amostra}{r.amostra > 0 && r.amostra < 10 ? tr(' · amostra pequena', ' · small sample') : ''}</p>
      </div>
      {(r.datasInvalidas > 0 || r.conclusoesSemDuracao > 0) && <p role="status" className="text-sm">{r.datasInvalidas} {tr('itens com datas ausentes, futuras ou inconsistentes. Durações inválidas são excluídas:', 'items with missing, future or inconsistent dates. Invalid durations excluded:')} {r.conclusoesSemDuracao}.</p>}
      <h3 className="font-semibold">{tr('Carga atual por responsável', 'Current workload by assignee')}</h3>
      <p className="text-sm text-tinta-suave">{tr('Abertas e atrasos: todas as pendências atuais, inclusive anteriores ao período. Conclusões: período selecionado, agrupadas pelo responsável atual; não medem produtividade individual. Atrasos usam o prazo atual.', 'Open items and delays: all current items, including those predating the period. Completions: selected period, grouped by current assignee; not individual productivity. Delays use the current deadline.')}</p>
      {!r.equipes.length ? <p>{tr('Nenhum item para este relatório.', 'No items for this report.')}</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left"><caption className="sr-only">{tr('Carga atual e conclusões no período', 'Current workload and completions in period')}</caption><thead><tr>{[tr('Responsável', 'Assignee'), tr('Abertas', 'Open'), tr('Vencidas / abertas', 'Overdue / open'), tr('Maior atraso', 'Longest delay'), tr('Concluídas', 'Completed')].map(label => <th scope="col" className="p-2 border-b border-linha" key={label}>{label}</th>)}</tr></thead><tbody>{r.equipes.map(e => <tr key={e.id}><th scope="row" className="p-2 font-medium">{e.nome || tr('Sem responsável', 'Unassigned')}</th><td className="p-2 tabular-nums">{e.abertas}</td><td className="p-2 tabular-nums">{e.vencidas} / {e.abertas}</td><td className="p-2 tabular-nums">{e.vencidas ? `${e.atrasoMaximoHoras.toFixed(1)} h` : '—'}</td><td className="p-2 tabular-nums">{e.concluidas}</td></tr>)}</tbody></table></div>}
      <details><summary className="min-h-11 cursor-pointer font-medium">{tr('Atividade diária registrada', 'Recorded daily activity')}</summary><table className="w-full text-sm text-left"><caption className="sr-only">{tr('Criadas e concluídas por dia', 'Created and completed per day')}</caption><thead><tr><th scope="col" className="p-2">{tr('Data', 'Date')}</th><th scope="col" className="p-2">{tr('Criadas', 'Created')}</th><th scope="col" className="p-2">{tr('Concluídas', 'Completed')}</th></tr></thead><tbody>{r.serie.map(d => <tr key={d.dia}><th scope="row" className="p-2 font-normal">{data(d.dia)}</th><td className="p-2">{d.criadas}</td><td className="p-2">{d.concluidas}</td></tr>)}</tbody></table></details>
      <p className="text-sm text-tinta-suave">{tr('Datas vêm dos registros disponíveis. O relatório não reconstrói o tamanho histórico da fila, não mede leitura ou resposta clínica e não comprova resultado assistencial.', 'Dates come from available records. This report does not reconstruct historical backlog, measure reading or clinical response, or demonstrate patient outcomes.')}</p>
    </div>
  </details>;
}
