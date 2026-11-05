import React, { useRef, useState } from 'react';
import type { AtualizarBarreiraInput, BarreiraAcesso, CategoriaBarreira, CriarBarreiraInput, EstadoBarreira, PacientePro, UsuarioEquipe } from '../types';
import type { AcoesPro } from '../api/pro';
import { tr } from '../idioma';

const categorias = (): Record<CategoriaBarreira, string> => ({ transporte: tr('Transporte', 'Transport'), agendamento: tr('Agendamento', 'Scheduling'), apoio_social: tr('Apoio social', 'Social support'), comunicacao: tr('Comunicação e acessibilidade', 'Communication and accessibility'), outra: tr('Outra dificuldade de acesso', 'Other access barrier') });
const estados = (): Record<EstadoBarreira, string> => ({ aberta: tr('Aberta', 'Open'), em_acompanhamento: tr('Em acompanhamento', 'Being followed up'), resolvida: tr('Resolvida', 'Resolved'), encerrada_sem_resolucao: tr('Encerrada sem resolução', 'Closed unresolved') });
const campo = 'min-h-11 min-w-0 rounded-lg border border-linha bg-white p-2 w-full';
const quando = (iso: string) => new Intl.DateTimeFormat(tr('pt-BR', 'en-US'), { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
const encerrada = (b: BarreiraAcesso) => b.estado === 'resolvida' || b.estado === 'encerrada_sem_resolucao';
function Prazo({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-1">{tr('Novo prazo operacional (horário deste aparelho)', 'New operational deadline (device time)')}<input type="datetime-local" required value={value} onChange={e => onChange(e.target.value)} className={campo} /></label>;
}
function Responsavel({ value, onChange, usuarios }: { value: string; onChange: (value: string) => void; usuarios: UsuarioEquipe[] }) {
  return <label className="grid gap-1">{tr('Responsável', 'Assignee')}<select required className={campo} value={value} onChange={e => onChange(e.target.value)}><option value="">{tr('Escolha um profissional', 'Choose a professional')}</option>{usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></label>;
}
function EditarBarreira({ barreira: b, usuarios, salvar, cancelar }: { barreira: BarreiraAcesso; usuarios: UsuarioEquipe[]; salvar: (input: AtualizarBarreiraInput) => Promise<void>; cancelar: () => void }) {
  const [base] = useState(b); // Keep the revision from when editing began, despite polling.
  const [estado, setEstado] = useState(base.estado);
  const [responsavelId, setResponsavel] = useState(base.responsavelId);
  const [prazo, setPrazo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState(''); const [busy, setBusy] = useState(false); const lock = useRef(false);
  return <form className="grid gap-3 text-sm border-t border-linha pt-3" onSubmit={async e => { e.preventDefault(); if (lock.current) return; lock.current = true; setBusy(true); setErro(''); try { await salvar({ revisao: base.revisao, estado, responsavelId, prazo: prazo ? new Date(prazo).toISOString() : base.prazo, motivo }); cancelar(); } catch (error) { setErro((error as Error).message); } finally { lock.current = false; setBusy(false); } }}>
    <label className="grid gap-1">{tr('Situação', 'Status')}<select className={campo} value={estado} onChange={e => setEstado(e.target.value as EstadoBarreira)}>{Object.entries(estados()).filter(([key]) => base.estado === 'aberta' || key !== 'aberta').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <Responsavel value={responsavelId} onChange={setResponsavel} usuarios={usuarios} />
    <label className="flex gap-2 items-center"><input type="checkbox" checked={!!prazo} onChange={e => setPrazo(e.target.checked ? new Date(Date.now() + 86_400_000 - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : '')} />{tr('Alterar prazo', 'Change deadline')}</label>
    {prazo && <Prazo value={prazo} onChange={setPrazo} />}
    <label className="grid gap-1">{tr('Ação realizada e justificativa (interna)', 'Action taken and reason (internal)')}<textarea required minLength={8} maxLength={500} value={motivo} onChange={e => setMotivo(e.target.value)} className={campo} /></label>
    <p className="text-tinta-suave">{tr('Para encerrar, o responsável deve registrar o que foi resolvido ou por que não houve resolução. Encaminhar para outro serviço, por si só, não confirma a resolução.', 'To close, the assignee must record what was resolved or why it remains unresolved. A referral alone does not confirm resolution.')}</p>
    {erro && <p role="alert" className="text-urgente">{erro}</p>}
    <div className="flex gap-2"><button type="submit" disabled={busy} className={`${campo} bg-azul text-white`}>{busy ? tr('Salvando…', 'Saving…') : tr('Salvar acompanhamento', 'Save follow-up')}</button><button type="button" disabled={busy} className={campo} onClick={cancelar}>{tr('Cancelar', 'Cancel')}</button></div>
  </form>;
}
export function BarreirasAcesso({ paciente, usuarios, acoes }: { paciente: PacientePro; usuarios: UsuarioEquipe[]; acoes: AcoesPro }) {
  const [mostrarForm, setMostrarForm] = useState(false); const [editando, setEditando] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<CategoriaBarreira>('transporte'); const [descricao, setDescricao] = useState(''); const [responsavelId, setResponsavel] = useState(''); const [prazo, setPrazo] = useState('');
  const [chave, setChave] = useState(() => crypto.randomUUID()); const [erro, setErro] = useState(''); const [mensagem, setMensagem] = useState(''); const [busy, setBusy] = useState(false); const lock = useRef(false);
  const barreiras = [...(paciente.barreiras ?? [])].sort((a, b) => Number(encerrada(a)) - Number(encerrada(b)) || a.prazo.localeCompare(b.prazo));
  return <section className="space-y-4" aria-label={tr('Barreiras de acesso ao cuidado', 'Barriers to accessing care')}>
    <div className="flex flex-wrap gap-3 justify-between items-start"><div><h3 className="font-semibold text-azul">{tr('Barreiras de acesso ao cuidado', 'Barriers to accessing care')}</h3><p className="text-sm text-tinta-suave">{tr('Registro manual da equipe · dados fictícios', 'Manual team records · fictional data')}</p></div><button type="button" className="min-h-11 rounded-lg border border-linha px-3" onClick={() => { setMostrarForm(!mostrarForm); setErro(''); setMensagem(''); }}>{mostrarForm ? tr('Fechar formulário', 'Close form') : tr('Registrar barreira', 'Record barrier')}</button></div>
    <p className="text-sm text-tinta-suave">{tr('Notas internas. Este registro não agenda transporte, não concede benefício e não envia orientação ao paciente. Prazos são operacionais; esta tela não faz triagem clínica.', 'Internal notes. This record does not book transport, grant benefits or send patient guidance. Deadlines are operational; this screen does not perform clinical triage.')}</p>
    {mostrarForm && <form className="grid gap-3 border border-linha rounded-xl p-4 text-sm" onSubmit={async e => { e.preventDefault(); if (lock.current) return; lock.current = true; setBusy(true); setErro(''); try { const input: CriarBarreiraInput = { chave, categoria, descricao, responsavelId, prazo: new Date(prazo).toISOString() }; await acoes.criarBarreira(paciente.id, input); setMostrarForm(false); setDescricao(''); setPrazo(''); setChave(crypto.randomUUID()); setMensagem(tr('Barreira registrada para acompanhamento da equipe.', 'Barrier recorded for team follow-up.')); } catch (error) { setErro((error as Error).message); } finally { lock.current = false; setBusy(false); } }}>
      <label className="grid gap-1">{tr('Categoria', 'Category')}<select className={campo} value={categoria} onChange={e => setCategoria(e.target.value as CategoriaBarreira)}>{Object.entries(categorias()).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="grid gap-1">{tr('Dificuldade identificada (interna)', 'Identified barrier (internal)')}<textarea required minLength={8} maxLength={500} value={descricao} onChange={e => setDescricao(e.target.value)} className={campo} /></label>
      <Responsavel value={responsavelId} onChange={setResponsavel} usuarios={usuarios} /><Prazo value={prazo} onChange={setPrazo} />
      {erro && <p role="alert" className="text-urgente">{erro}</p>}<button type="submit" disabled={busy} className={`${campo} bg-azul text-white`}>{busy ? tr('Registrando…', 'Recording…') : tr('Confirmar registro', 'Confirm record')}</button>
    </form>}
    {mensagem && <p role="status" className="text-sm">{mensagem}</p>}
    {!barreiras.length && <p className="rounded-xl border border-linha bg-gelo p-4 text-sm">{tr('Nenhuma barreira registrada. Isso não significa ausência de dificuldades: converse com o paciente.', 'No barriers recorded. This does not mean there are no difficulties: discuss access with the patient.')}</p>}
    {barreiras.map(b => <article key={b.id} className="rounded-xl border border-linha p-4 space-y-3 text-sm">
      <h4 className="font-semibold">{categorias()[b.categoria]} · {estados()[b.estado]}</h4><p className="whitespace-pre-wrap break-words">{b.descricao}</p>
      <p>{tr('Responsável:', 'Assignee:')} {usuarios.find(u => u.id === b.responsavelId)?.nome ?? b.responsavelId} · {tr('Prazo:', 'Deadline:')} {quando(b.prazo)}{!encerrada(b) && Date.parse(b.prazo) < Date.now() ? tr(' · Prazo operacional vencido', ' · Operational deadline overdue') : ''}</p>
      {!encerrada(b) && editando !== b.id && <button type="button" className="min-h-11 underline" onClick={() => setEditando(b.id)}>{tr('Registrar acompanhamento ou desfecho', 'Record follow-up or outcome')}</button>}
      {editando === b.id && <EditarBarreira barreira={b} usuarios={usuarios} cancelar={() => setEditando(null)} salvar={input => acoes.atualizarBarreira(paciente.id, b.id, input)} />}
      <details><summary className="min-h-11 cursor-pointer">{tr('Histórico interno', 'Internal history')} ({b.historico.length})</summary><ol className="space-y-3">{b.historico.map((h, i) => <li key={i} className="border-l-2 border-linha pl-3"><p className="font-medium">{h.atorNome} · {quando(h.em)}</p><p className="whitespace-pre-wrap break-words">{h.motivo}</p><p>{h.anterior ? `${estados()[h.anterior.estado]} → ` : ''}{estados()[h.novo.estado]} · {usuarios.find(u => u.id === h.novo.responsavelId)?.nome ?? h.novo.responsavelId} · {quando(h.novo.prazo)}</p>{h.anterior && <p className="text-tinta-suave">{tr('Antes:', 'Before:')} {usuarios.find(u => u.id === h.anterior!.responsavelId)?.nome ?? h.anterior.responsavelId} · {quando(h.anterior.prazo)}</p>}</li>)}</ol></details>
    </article>)}
  </section>;
}
