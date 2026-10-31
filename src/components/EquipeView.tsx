// Painel "Equipe" do OncoFlow Pro (base: EquipeView do IRIS). Os contadores agora contam
// pendências com prazo e responsável; "Alertas clínicos" virou "Pendências", ordenadas por prazo.

import React, { useState, useMemo } from 'react';
import { Search, AlertTriangle, Clock, Users, ClipboardList, Filter, Stethoscope } from 'lucide-react';
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
  estado,
  usuarioAtual,
  acoes,
  pacienteSelecionadoId,
  onSelecionarPaciente,
  onEntrarConversa,
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
      return (
        p.nome.toLowerCase().includes(termo) ||
        p.diagnosticoResumido.toLowerCase().includes(termo) ||
        p.esquemaResumido.toLowerCase().includes(termo) ||
        p.cicloAtual.toLowerCase().includes(termo)
      );
    });
  }, [pacientes, filtro, busca]);

  const pendenciasAbertas = useMemo(
    () =>
      pacientes
        .flatMap((p) => p.pendencias.filter((pe) => pe.estado !== 'concluida').map((pe) => ({ pendencia: pe, paciente: p })))
        .filter(({ pendencia }) => filtro !== 'sinal_a_revisar' || pendencia.tipo === 'sinal_urgencia')
        .sort((a, b) => a.pendencia.prazo.localeCompare(b.pendencia.prazo)),
    [pacientes, filtro]
  );

  const pacienteSelecionado =
    pacientes.find((p) => p.id === pacienteSelecionadoId) ?? pacientesFiltrados[0] ?? pacientes[0];
  const chatPaciente = pacientes.find((p) => p.id === chatAbertoId);
  const planoPaciente = pacientes.find((p) => p.id === planoAbertoId);

  const totalSinais = pacientes.reduce(
    (n, p) => n + p.pendencias.filter((pe) => pe.estado !== 'concluida' && pe.tipo === 'sinal_urgencia').length,
    0
  );
  const totalAguardando = pacientes.reduce(
    (n, p) => n + p.pendencias.filter((pe) => pe.estado !== 'concluida' && pe.tipo !== 'sinal_urgencia').length,
    0
  );

  const cartao = (ativo: boolean, cor: 'neutro' | 'atencao' | 'urgente') =>
    `p-4 rounded-xl border text-left transition-all cursor-pointer ${
      ativo
        ? cor === 'urgente'
          ? 'bg-urgente-fundo border-urgente'
          : cor === 'atencao'
          ? 'bg-atencao-fundo border-atencao'
          : 'bg-gelo border-verde'
        : 'bg-white border-linha hover:border-verde/50'
    }`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <button
          type="button"
          onClick={() => {
            setSubAba('pacientes');
            setFiltro('todos');
          }}
          className={cartao(subAba === 'pacientes' && filtro === 'todos', 'neutro')}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-semibold text-azul">
              <Users className="w-4 h-4 text-verde" aria-hidden />
              Pacientes em acompanhamento
            </span>
            <span className="text-xl font-bold text-azul tabular-nums">{pacientes.length}</span>
          </div>
          <p className="text-[11px] text-tinta-suave mt-1">Dados fictícios da demo</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubAba('pendencias');
            setFiltro('todos');
          }}
          className={cartao(subAba === 'pendencias' && filtro === 'todos', 'atencao')}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-semibold text-atencao">
              <Clock className="w-4 h-4" aria-hidden />
              Aguardando revisão
            </span>
            <span className="text-xl font-bold text-atencao tabular-nums">{totalAguardando}</span>
          </div>
          <p className="text-[11px] text-tinta-suave mt-1">Check-ins e pedidos dos pacientes, com prazo do serviço</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubAba('pendencias');
            setFiltro('sinal_a_revisar');
          }}
          className={cartao(filtro === 'sinal_a_revisar', 'urgente')}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-semibold text-urgente">
              <AlertTriangle className="w-4 h-4" aria-hidden />
              Possíveis sinais de urgência
            </span>
            <span className="text-xl font-bold text-urgente tabular-nums">{totalSinais}</span>
          </div>
          <p className="text-[11px] text-tinta-suave mt-1">Hipóteses do sistema (termos definidos pelo serviço) para revisar</p>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-linha space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div role="tablist" className="flex items-center gap-2">
            {(
              [
                ['pacientes', 'Pacientes', Users, pacientes.length],
                ['pendencias', 'Pendências', ClipboardList, totalAguardando + totalSinais],
              ] as const
            ).map(([aba, rotulo, Icone, total]) => (
              <button
                key={aba}
                type="button"
                role="tab"
                aria-selected={subAba === aba}
                id={`subtab-${aba}`}
                onClick={() => {
                  setSubAba(aba);
                  setFiltro('todos');
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                  subAba === aba ? 'bg-azul text-white' : 'bg-fundo text-tinta-suave hover:text-azul border border-linha'
                }`}
              >
                <Icone className="w-4 h-4" aria-hidden />
                {rotulo}
                <span className={`px-1.5 rounded-full text-[10px] ${subAba === aba ? 'bg-verde text-white' : 'bg-gelo text-azul'}`}>
                  {total}
                </span>
              </button>
            ))}
          </div>

          {subAba === 'pacientes' && (
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-tinta-suave" aria-hidden />
              <label htmlFor="input-busca-paciente" className="sr-only">
                Buscar paciente
              </label>
              <input
                type="text"
                id="input-busca-paciente"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar paciente, diagnóstico, esquema ou ciclo…"
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-linha rounded-lg focus:outline-none focus:ring-2 focus:ring-verde text-azul bg-fundo"
              />
            </div>
          )}
        </div>

        {subAba === 'pacientes' ? (
          <div>
            <div className="text-[11px] font-semibold text-tinta-suave uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-verde" aria-hidden />
              Selecione um paciente
            </div>
            {pacientesFiltrados.length === 0 ? (
              <div className="p-4 text-center text-xs text-tinta-suave bg-fundo rounded-lg border border-dashed border-linha">
                Nenhum paciente encontrado para essa busca.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {pacientesFiltrados.map((p) => {
                  const selecionado = p.id === pacienteSelecionado?.id;
                  const info = infoSituacao(p.situacao);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      id={`chip-paciente-${p.id}`}
                      aria-pressed={selecionado}
                      onClick={() => onSelecionarPaciente(p.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                        selecionado ? 'bg-azul text-white border-azul' : `${info.classes} hover:opacity-90`
                      }`}
                    >
                      <info.Icone className="w-3.5 h-3.5" aria-hidden />
                      <span>{p.nome}</span>
                      <span className="text-[10px] font-normal opacity-90">· {info.rotulo}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-[11px] text-tinta-suave">
              Ordenadas pelo prazo definido pelo serviço. Regras de revisão em uso (exemplos, a definir com o serviço):{' '}
              {estado.regrasRevisao.map((r) => r.descricao).join(' · ')}.
            </p>
            {pendenciasAbertas.length === 0 ? (
              <div className="p-4 text-center text-xs text-tinta-suave bg-fundo rounded-lg border border-dashed border-linha">
                Nenhuma pendência aberta.
              </div>
            ) : (
              pendenciasAbertas.map(({ pendencia, paciente }) => (
                <PendenciaItem
                  key={pendencia.id}
                  pendencia={pendencia}
                  nomePaciente={paciente.nome}
                  onAssumir={acoes.assumirPendencia}
                  onConcluir={acoes.concluirPendencia}
                />
              ))
            )}
          </div>
        )}
      </div>

      {subAba === 'pacientes' && pacienteSelecionado && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-azul uppercase tracking-wider flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-verde" aria-hidden />
              Perfil do paciente
            </h2>
            <span className="text-xs text-tinta-suave">
              Visualizando <strong className="text-azul">{pacienteSelecionado.nome}</strong>
            </span>
          </div>
          <PacienteCard
            paciente={pacienteSelecionado}
            onEntrarConversa={onEntrarConversa}
            onVerUltimasMensagens={(p: PacientePro) => setChatAbertoId(p.id)}
            onVerPlanoTerapeutico={(p: PacientePro) => setPlanoAbertoId(p.id)}
            onPlanoAtualizado={acoes.atualizarPlano}
            onAssumirPendencia={acoes.assumirPendencia}
            onConcluirPendencia={acoes.concluirPendencia}
          />
        </div>
      )}

      {planoPaciente && <PlanoTerapeuticoModal paciente={planoPaciente} onFechar={() => setPlanoAbertoId(null)} />}

      {chatPaciente && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Conversa com ${chatPaciente.nome}`}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-linha overflow-hidden p-2">
            <ChatView
              paciente={chatPaciente}
              usuarioAtual={usuarioAtual}
              acoes={acoes}
              minutosRetornoLia={estado.minutosRetornoLia}
              onFechar={() => setChatAbertoId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
