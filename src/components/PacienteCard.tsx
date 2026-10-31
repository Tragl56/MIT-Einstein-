// Card do paciente no OncoFlow Pro (base: PacienteCard do IRIS). O antigo "Status da Triagem IRIS"
// virou a lista de pendências com origem, prazo e responsável, e o seletor manual de alerta saiu:
// a cor agora é a situação operacional derivada das pendências, não prioridade clínica.

import React from 'react';
import {
  Activity,
  Clock,
  MessageSquare,
  UserCheck,
  Stethoscope,
  Pill,
  Calendar,
  FileText,
  FileSearch,
  ClipboardList,
  HeartPulse,
} from 'lucide-react';
import type { Desfecho, PacientePro } from '../types';
import { ROTULO_OPCAO_CHECKIN } from '../types';
import { UploadPlanoButton } from './UploadPlanoButton';
import { BadgeSituacao, PendenciaItem } from './Pendencias';
import { OrbeMini } from './OrbeMini';

interface PacienteCardProps {
  paciente: PacientePro;
  onEntrarConversa: (pacienteId: string) => void;
  onVerUltimasMensagens: (paciente: PacientePro) => void;
  onVerPlanoTerapeutico: (paciente: PacientePro) => void;
  onPlanoAtualizado: (pacienteId: string, novoTexto: string, dataHoraAtualizada: string) => void;
  onAssumirPendencia: (id: string) => void;
  onConcluirPendencia: (id: string, desfecho: Desfecho) => void;
}

function dataHora(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export const PacienteCard: React.FC<PacienteCardProps> = ({
  paciente,
  onEntrarConversa,
  onVerUltimasMensagens,
  onVerPlanoTerapeutico,
  onPlanoAtualizado,
  onAssumirPendencia,
  onConcluirPendencia,
}) => {
  const abertas = paciente.pendencias.filter((p) => p.estado !== 'concluida');
  const concluidas = paciente.pendencias.filter((p) => p.estado === 'concluida');
  const checkins = [...paciente.checkins].sort((a, b) => b.em.localeCompare(a.em)).slice(0, 4);
  const etapaAtual = paciente.jornada.find((e) => e.estado === 'em_andamento');

  return (
    <div id={`card-paciente-${paciente.id}`} className="patient-record-card">
      <div className="p-5 border-b border-linha bg-gradient-to-r from-white to-gelo/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gelo text-azul font-bold text-sm flex items-center justify-center border border-linha">
              {paciente.nome.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-azul tracking-tight">{paciente.nome}</h3>
                <span className="text-xs text-tinta-suave font-medium">· {paciente.idade} anos</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-tinta-suave mt-0.5">
                <span className="flex items-center gap-1 font-semibold text-azul">
                  <Activity className="w-3.5 h-3.5 text-verde" aria-hidden />
                  {paciente.ecog}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" aria-hidden />
                  Última interação: {paciente.ultimaInteracao}
                </span>
                {etapaAtual && <span>Etapa atual: {etapaAtual.titulo}</span>}
              </div>
            </div>
          </div>
          <BadgeSituacao situacao={paciente.situacao} />
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-start gap-2.5">
          <Stethoscope className="w-4 h-4 text-verde shrink-0 mt-0.5" aria-hidden />
          <div className="text-xs flex-1">
            <span className="font-semibold text-azul block">Diagnóstico resumido</span>
            <p className="text-azul mt-0.5 leading-relaxed">{paciente.diagnosticoResumido}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-linha">
          <div className="flex items-start gap-2.5">
            <Pill className="w-4 h-4 text-verde shrink-0 mt-0.5" aria-hidden />
            <div className="text-xs">
              <span className="font-semibold text-azul block">Esquema resumido</span>
              <p className="text-azul mt-0.5 leading-relaxed">{paciente.esquemaResumido}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Calendar className="w-4 h-4 text-verde shrink-0 mt-0.5" aria-hidden />
            <div className="text-xs">
              <span className="font-semibold text-azul block">Ciclo atual</span>
              <p className="inline-block mt-0.5 px-2 py-0.5 bg-gelo text-azul font-semibold rounded text-xs border border-linha">
                {paciente.cicloAtual}
              </p>
            </div>
          </div>
        </div>

        <section aria-label="Pendências" className="pt-2 border-t border-linha space-y-2">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-azul">
            <ClipboardList className="w-3.5 h-3.5 text-verde" aria-hidden />
            Pendências ({abertas.length} abertas)
          </h4>
          {abertas.length === 0 ? (
            <p className="text-xs text-tinta-suave">Nenhuma pendência aberta.</p>
          ) : (
            abertas.map((p) => (
              <PendenciaItem key={p.id} pendencia={p} onAssumir={onAssumirPendencia} onConcluir={onConcluirPendencia} />
            ))
          )}
          {concluidas.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-tinta-suave hover:text-azul">{concluidas.length} revisadas</summary>
              <div className="space-y-2 mt-2">
                {concluidas.map((p) => (
                  <PendenciaItem key={p.id} pendencia={p} onAssumir={onAssumirPendencia} onConcluir={onConcluirPendencia} />
                ))}
              </div>
            </details>
          )}
        </section>

        <section aria-label="Check-ins recentes" className="pt-2 border-t border-linha">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-azul mb-2">
            <HeartPulse className="w-3.5 h-3.5 text-verde" aria-hidden />
            Check-ins recentes
          </h4>
          {checkins.length === 0 ? (
            <p className="text-xs text-tinta-suave">Nenhum check-in registrado.</p>
          ) : (
            <ul className="space-y-1.5">
              {checkins.map((c) => (
                <li key={c.id} className="text-xs flex flex-wrap items-baseline gap-x-2">
                  <span className="text-tinta-suave tabular-nums">{dataHora(c.em)}</span>
                  <span className="font-semibold text-azul">
                    {c.opcoes.map((o) => ROTULO_OPCAO_CHECKIN[o]).join(', ') || 'Sem opção marcada'}
                  </span>
                  {c.origem === 'voz' && <span className="text-tinta-suave">· por voz</span>}
                  {c.texto && <span className="text-azul">“{c.texto}”</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="p-3.5 rounded-lg bg-gelo/50 border border-linha flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-verde shrink-0" aria-hidden />
            <div>
              <span className="font-semibold text-azul block">Plano terapêutico (documento da equipe)</span>
              <span className="text-[11px] text-tinta-suave">
                {paciente.planoAtualizadoEm ? `Atualizado em ${paciente.planoAtualizadoEm}` : 'Ainda não anexado'} · não é usado pela Lia
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id={`btn-ver-plano-${paciente.id}`}
              onClick={() => onVerPlanoTerapeutico(paciente)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-azul bg-white hover:bg-gelo border border-linha rounded-lg cursor-pointer"
            >
              <FileSearch className="w-3.5 h-3.5 text-verde" aria-hidden />
              Ver plano
            </button>
            <UploadPlanoButton pacienteId={paciente.id} pacienteNome={paciente.nome} onPlanoAtualizado={onPlanoAtualizado} />
          </div>
        </div>
      </div>

      <div className="p-4 bg-fundo border-t border-linha flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-tinta-suave flex items-center gap-1.5">
          {paciente.modoConversa === 'profissional' ? (
            <>
              <UserCheck className="w-3.5 h-3.5 text-verde" aria-hidden />
              Em atendimento por {paciente.profissionalResponsavel}
            </>
          ) : (
            <>
              <OrbeMini className="w-3.5 h-3.5" />
              Lia atendendo o paciente
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            id={`btn-ver-mensagens-${paciente.id}`}
            onClick={() => onVerUltimasMensagens(paciente)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-azul bg-white hover:bg-gelo border border-linha rounded-lg cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-verde" aria-hidden />
            Ver conversa
          </button>
          <button
            type="button"
            id={`btn-entrar-conversa-${paciente.id}`}
            onClick={() => onEntrarConversa(paciente.id)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-verde hover:bg-verde-escuro rounded-lg cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" aria-hidden />
            Entrar na conversa
          </button>
        </div>
      </div>
    </div>
  );
};
