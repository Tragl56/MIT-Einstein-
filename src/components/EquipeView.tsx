// Operational team view. All actions use the existing API contracts.
import React, { useState, useMemo } from 'react';
import { Search, AlertTriangle, Clock, Users, ClipboardList, CalendarDays, Stethoscope } from 'lucide-react';
import type { EstadoPro, PacientePro, SituacaoPaciente, UsuarioEquipe } from '../types';
import type { AcoesPro } from '../api/pro';
import { PacienteCard } from './PacienteCard';
import { ChatView } from './ChatView';
import { PlanoTerapeuticoModal } from './PlanoTerapeuticoModal';
import { infoSituacao, PendenciaItem } from './Pendencias';

interface EquipeViewProps {
  estado: EstadoPro;
  usuarioAtual: UsuarioEquipe;
  acoes: AcoesPro;
  pacienteSelecionadoId: string;
  onSelecionarPaciente: (id: string) => void;
  onEntrarConversa: (pacienteId: string) => void;
}

export const EquipeView: React.FC<EquipeViewProps> = ({
  estado, usuarioAtual, acoes, pacienteSelecionadoId, onSelecionarPaciente, onEntrarConversa,
}) => {
  const { pacientes } = estado;
  const [subAba, setSubAba] = useState<'pacientes' | 'pendencias'>('pacientes');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<SituacaoPaciente | 'todos'>('todos');
  const [chatAbertoId, setChatAbertoId] = useState<string | null>(null);
  const [planoAbertoId, setPlanoAbertoId] = useState<string | null>(null);

  const pacientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pacientes.filter((p) => {
      if (filtro !== 'todos' && p.situacao !== filtro) return false;
      if (!termo) return true;
      return [p.nome, p.diagnosticoResumido, p.esquemaResumido, p.cicloAtual]
        .some((valor) => valor.toLowerCase().includes(termo));
    });
  }, [pacientes, filtro, busca]);

  const pendenciasAbertas = useMemo(() => pacientes
    .flatMap((p) => p.pendencias.filter((pe) => pe.estado !== 'concluida').map((pe) => ({ pendencia: pe, paciente: p })))
    .filter(({ pendencia }) => filtro !== 'sinal_a_revisar' || pendencia.tipo === 'sinal_urgencia')
    .sort((a, b) => a.pendencia.prazo.localeCompare(b.pendencia.prazo)), [pacientes, filtro]);

  const pacienteSelecionado = pacientesFiltrados.find((p) => p.id === pacienteSelecionadoId) ?? pacientesFiltrados[0];
  const chatPaciente = pacientes.find((p) => p.id === chatAbertoId);
  const planoPaciente = pacientes.find((p) => p.id === planoAbertoId);
  const totalSinais = pacientes.reduce((n, p) => n + p.pendencias.filter((pe) => pe.estado !== 'concluida' && pe.tipo === 'sinal_urgencia').length, 0);
  const totalAguardando = pacientes.reduce((n, p) => n + p.pendencias.filter((pe) => pe.estado !== 'concluida' && pe.tipo !== 'sinal_urgencia').length, 0);
  const hoje = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <div className="pro-content">
      <header className="pro-page-heading">
        <div><h1>Pacientes e acompanhamento</h1><p>Uma visão dos próximos passos e de quem precisa da sua equipe.</p></div>
        <span className="pro-heading-date"><CalendarDays size={15} aria-hidden />{hoje}</span>
      </header>

      <div className="operational-summary" aria-label="Resumo do acompanhamento">
        <button type="button" className="summary-metric" aria-pressed={subAba === 'pacientes' && filtro === 'todos'}
          onClick={() => { setSubAba('pacientes'); setFiltro('todos'); }}>
          <Users size={21} className="text-verde" aria-hidden /><div><strong>Pacientes em acompanhamento</strong><small>Dados fictícios da demonstração</small></div><span className="summary-value">{pacientes.length}</span>
        </button>
        <button type="button" className="summary-metric" aria-pressed={subAba === 'pendencias' && filtro === 'todos'}
          onClick={() => { setSubAba('pendencias'); setFiltro('todos'); }}>
          <Clock size={21} className="text-atencao" aria-hidden /><div><strong>Aguardando revisão</strong><small>Check-ins e pedidos com prazo</small></div><span className="summary-value text-atencao">{totalAguardando}</span>
        </button>
        <button type="button" className="summary-metric" aria-pressed={filtro === 'sinal_a_revisar'}
          onClick={() => { setSubAba('pendencias'); setFiltro('sinal_a_revisar'); }}>
          <AlertTriangle size={21} className="text-urgente" aria-hidden /><div><strong>Possíveis sinais de urgência</strong><small>Hipóteses do sistema para revisar</small></div><span className="summary-value text-urgente">{totalSinais}</span>
        </button>
      </div>

      <div className="workspace-toolbar">
        <div className="workspace-tabs" role="tablist" aria-label="Visualização da equipe">
          {([['pacientes', 'Pacientes', Users, pacientes.length], ['pendencias', 'Pendências', ClipboardList, totalAguardando + totalSinais]] as const).map(([aba, rotulo, Icone, total]) => (
            <button key={aba} type="button" role="tab" aria-selected={subAba === aba} tabIndex={subAba === aba ? 0 : -1}
              id={`subtab-${aba}`} aria-controls={`painel-${aba}`}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const destino = event.key === 'Home' ? 'pacientes' : event.key === 'End' ? 'pendencias' : aba === 'pacientes' ? 'pendencias' : 'pacientes';
                setSubAba(destino); setFiltro('todos');
                document.getElementById(`subtab-${destino}`)?.focus();
              }}
              onClick={() => { setSubAba(aba); setFiltro('todos'); }} className="workspace-tab">
              <Icone size={16} aria-hidden />{rotulo}<span>{total}</span>
            </button>
          ))}
        </div>
        {subAba === 'pacientes' && <div className="workspace-search">
          <Search size={16} aria-hidden /><label htmlFor="input-busca-paciente" className="sr-only">Buscar paciente</label>
          <input id="input-busca-paciente" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar paciente ou diagnóstico" />
        </div>}
      </div>

      {subAba === 'pacientes' ? (
        <div className="patient-workbench" role="tabpanel" id="painel-pacientes" aria-labelledby="subtab-pacientes">
          <section className="patient-selector" aria-label="Selecione um paciente">
            <div className="patient-selector-heading">Seus pacientes<span>{pacientesFiltrados.length} na lista</span></div>
            <div className="patient-selector-list">
              {pacientesFiltrados.length === 0 ? <p className="p-4 text-xs text-tinta-suave">Nenhum paciente encontrado para essa busca.</p> : pacientesFiltrados.map((p) => {
                const info = infoSituacao(p.situacao);
                return <button key={p.id} type="button" id={`chip-paciente-${p.id}`}
                  aria-pressed={p.id === pacienteSelecionado?.id} onClick={() => onSelecionarPaciente(p.id)} className="patient-select-item">
                  <span className="patient-list-avatar" aria-hidden>{p.nome.split(' ').map((n) => n[0]).slice(0, 2).join('')}</span>
                  <span className="patient-list-info"><strong>{p.nome}</strong><small>{p.idade} anos · {p.cicloAtual}</small>
                    <span className={`patient-list-status ${p.situacao === 'sinal_a_revisar' ? 'text-urgente' : p.situacao === 'aguardando_revisao' ? 'text-atencao' : 'text-tinta-suave'}`}>
                      <info.Icone size={12} aria-hidden />{info.rotulo}
                    </span>
                  </span>
                </button>;
              })}
            </div>
          </section>
          {pacienteSelecionado ? <div className="patient-record">
            <p className="patient-record-label"><Stethoscope size={14} aria-hidden />Perfil e histórico do acompanhamento</p>
            <PacienteCard paciente={pacienteSelecionado} onEntrarConversa={onEntrarConversa}
              onVerUltimasMensagens={(p: PacientePro) => setChatAbertoId(p.id)}
              onVerPlanoTerapeutico={(p: PacientePro) => setPlanoAbertoId(p.id)}
              onPlanoAtualizado={acoes.atualizarPlano} onAssumirPendencia={acoes.assumirPendencia} onConcluirPendencia={acoes.concluirPendencia} />
          </div> : <div className="empty-surface">Ajuste a busca para encontrar um paciente e abrir seu perfil.</div>}
        </div>
      ) : (
        <section role="tabpanel" id="painel-pendencias" aria-labelledby="subtab-pendencias">
          <p className="queue-description">Ordenadas pelo prazo definido pelo serviço. Regras de revisão em uso (exemplos, a definir com o serviço): {estado.regrasRevisao.map((r) => r.descricao).join(' · ')}.</p>
          <div className="space-y-3">{pendenciasAbertas.length === 0 ? <div className="empty-surface">Nenhuma pendência aberta.</div> : pendenciasAbertas.map(({ pendencia, paciente }) => (
            <PendenciaItem key={pendencia.id} pendencia={pendencia} nomePaciente={paciente.nome} onAssumir={acoes.assumirPendencia} onConcluir={acoes.concluirPendencia} />
          ))}</div>
        </section>
      )}

      {planoPaciente && <PlanoTerapeuticoModal paciente={planoPaciente} onFechar={() => setPlanoAbertoId(null)} />}
      {chatPaciente && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Conversa com ${chatPaciente.nome}`}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-linha overflow-hidden p-2">
          <ChatView paciente={chatPaciente} usuarioAtual={usuarioAtual} acoes={acoes} minutosRetornoLia={estado.minutosRetornoLia} onFechar={() => setChatAbertoId(null)} />
        </div>
      </div>}
    </div>
  );
};
