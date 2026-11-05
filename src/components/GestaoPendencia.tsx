import { useState, type FormEvent } from 'react';
import type { GestaoPendenciaInput, Pendencia, UsuarioEquipe } from '../types';
import { ROTULO_DESFECHO, type Desfecho } from '../types';
import { tr } from '../idioma';

export function GestaoPendencia({ pendencia: p, usuarios, onSalvar }: { pendencia: Pendencia; usuarios: UsuarioEquipe[]; onSalvar: (id: string, input: GestaoPendenciaInput) => Promise<void> }) {
  const [editando, setEditando] = useState(false);
  const [revisao, setRevisao] = useState(0);
  const [responsavelId, setResponsavelId] = useState('');
  const [prazo, setPrazo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const abrir = () => { setRevisao(p.revisao ?? 0); setResponsavelId(p.responsavelId ?? ''); setPrazo(''); setMotivo(''); setErro(''); setConfirmacao(''); setEditando(true); };
  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (salvando) return;
    setSalvando(true); setErro('');
    try {
      const input: GestaoPendenciaInput = { revisao, motivo };
      if (responsavelId && responsavelId !== p.responsavelId) input.responsavelId = responsavelId;
      if (prazo) input.prazo = new Date(prazo).toISOString();
      await onSalvar(p.id, input);
      setEditando(false); setConfirmacao(tr('Alteração salva com histórico.', 'Change saved with history.'));
    } catch (error) { setErro(error instanceof Error ? error.message : tr('Falha ao salvar.', 'Could not save.')); }
    finally { setSalvando(false); }
  }
  const rotulos = { atribuida: tr('Responsável alterado', 'Assignment changed'), prazo_alterado: tr('Prazo alterado', 'Deadline changed'), assumida: tr('Atendimento assumido', 'Work started'), concluida: tr('Revisão concluída', 'Review completed') };
  const data = (iso: string) => new Intl.DateTimeFormat(tr('pt-BR', 'en-US'), { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
  return <div className="border-t border-linha pt-3 space-y-3">
    {p.estado !== 'concluida' && !editando && <button type="button" onClick={abrir} className="min-h-11 px-3 rounded-lg border border-linha text-azul font-semibold">{tr('Gerenciar responsável e prazo', 'Manage assignment and deadline')}</button>}
    {editando && <form onSubmit={salvar} className="grid gap-3 rounded-xl bg-gelo p-4" aria-label={tr('Gerenciar pendência', 'Manage pending item')}>
      <p className="text-sm text-tinta-suave">{tr('Prazo de trabalho da equipe. Não define prioridade clínica.', 'Team work deadline. It does not define clinical priority.')}</p>
      <label className="grid gap-1 text-sm font-medium">{tr('Responsável', 'Assignee')}<select value={responsavelId} disabled={salvando} onChange={e => setResponsavelId(e.target.value)} className="min-h-11 rounded-lg border border-linha bg-white px-3"><option value="">{tr('Manter responsável atual', 'Keep current assignment')}</option>{usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-medium">{tr('Novo prazo (opcional, horário deste dispositivo)', 'New deadline (optional, device local time)')}<input type="datetime-local" value={prazo} disabled={salvando} onChange={e => setPrazo(e.target.value)} className="min-h-11 min-w-0 rounded-lg border border-linha px-3" /></label>
      <label className="grid gap-1 text-sm font-medium">{tr('Justificativa da alteração', 'Reason for change')}<textarea required minLength={8} maxLength={500} value={motivo} disabled={salvando} onChange={e => setMotivo(e.target.value)} className="min-h-20 rounded-lg border border-linha p-3" /></label>
      {erro && <p role="alert" className="text-urgente text-sm">{erro}</p>}
      <div className="flex flex-wrap gap-2"><button type="submit" disabled={salvando} className="min-h-11 rounded-lg bg-verde px-4 text-white font-semibold disabled:opacity-50">{salvando ? tr('Salvando…', 'Saving…') : tr('Salvar alteração', 'Save change')}</button><button type="button" disabled={salvando} onClick={() => setEditando(false)} className="min-h-11 rounded-lg border border-linha px-4">{tr('Cancelar', 'Cancel')}</button></div>
    </form>}
    {confirmacao && <p role="status" className="text-sm text-verde">{confirmacao}</p>}
    <details className="text-sm"><summary className="cursor-pointer py-2 font-medium text-azul">{tr('Histórico de trabalho', 'Work history')} ({p.historico?.length ?? 0})</summary>
      {!p.historico?.length ? <p className="text-tinta-suave py-2">{tr('Nenhuma alteração registrada nesta versão.', 'No changes recorded in this version.')}</p> : <ol className="space-y-3 py-3">{[...p.historico].reverse().map(e => <li key={e.id} className="border-l-2 border-linha pl-3"><p className="font-semibold">{rotulos[e.acao]}</p><p>{e.atorNome} · {data(e.em)}</p>{e.para && <p>{e.acao === 'prazo_alterado' ? `${e.de ? data(e.de) : '—'} → ${data(e.para)}` : e.acao === 'concluida' ? ROTULO_DESFECHO[e.para as Desfecho] : e.para}</p>}{e.motivo && <p className="text-tinta-suave break-words whitespace-pre-wrap">{e.motivo}</p>}</li>)}</ol>}
    </details>
  </div>;
}
