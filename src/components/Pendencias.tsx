// Pendências da equipe: tudo o que espera revisão aparece com origem, status, responsável e prazo
// (princípio 3). Hipótese do sistema nunca aparece como fato, e o estado nunca depende só de cor.

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  ClipboardList,
  UserCheck,
  Quote,
} from 'lucide-react';
import type {
  Desfecho,
  OrigemPendencia,
  PapelEquipe,
  Pendencia,
  SituacaoPaciente,
  TipoPendencia,
} from '../types';
import { ROTULO_DESFECHO } from '../types';

export const ROTULO_TIPO: Record<TipoPendencia, string> = {
  sinal_urgencia: 'Possível sinal de urgência',
  checkin: 'Check-in',
  contato_equipe: 'Pedido de contato',
  reagendamento: 'Reagendamento',
  duvida: 'Dúvida do paciente',
};

export const ROTULO_PAPEL: Record<PapelEquipe, string> = {
  medico: 'Médica(o)',
  enfermagem: 'Enfermagem',
  navegacao: 'Navegação',
};

const ROTULO_ORIGEM: Record<OrigemPendencia, string> = {
  hipotese_sistema: 'Hipótese do sistema · aguardando revisão',
  solicitacao_paciente: 'Pedido confirmado pelo paciente',
  regra_servico: 'Regra do serviço',
};

export function infoSituacao(situacao: SituacaoPaciente) {
  switch (situacao) {
    case 'sinal_a_revisar':
      return {
        rotulo: 'Sinal a revisar',
        Icone: AlertTriangle,
        classes: 'bg-urgente-fundo border-urgente-borda text-urgente',
        ponto: 'bg-urgente',
      };
    case 'aguardando_revisao':
      return {
        rotulo: 'Aguardando revisão',
        Icone: Clock,
        classes: 'bg-atencao-fundo border-atencao-borda text-atencao',
        ponto: 'bg-atencao',
      };
    default:
      return {
        rotulo: 'Sem pendências',
        Icone: CheckCircle2,
        classes: 'bg-gelo border-linha text-azul',
        ponto: 'bg-verde',
      };
  }
}

export const BadgeSituacao: React.FC<{ situacao: SituacaoPaciente }> = ({ situacao }) => {
  const info = infoSituacao(situacao);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${info.classes}`}>
      <info.Icone className="w-3.5 h-3.5" aria-hidden />
      <span>{info.rotulo}</span>
    </span>
  );
};

export function descreverPrazo(prazoISO: string, agora = Date.now()): { texto: string; atrasada: boolean } {
  const diferenca = new Date(prazoISO).getTime() - agora;
  const horas = Math.round(Math.abs(diferenca) / 3_600_000);
  const quanto = horas >= 1 ? `${horas} h` : `${Math.max(1, Math.round(Math.abs(diferenca) / 60_000))} min`;
  return diferenca >= 0 ? { texto: `vence em ${quanto}`, atrasada: false } : { texto: `atrasada há ${quanto}`, atrasada: true };
}

function quando(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

interface PendenciaItemProps {
  pendencia: Pendencia;
  nomePaciente?: string;
  onAssumir: (id: string) => void;
  onConcluir: (id: string, desfecho: Desfecho) => void;
}

export const PendenciaItem: React.FC<PendenciaItemProps> = ({ pendencia, nomePaciente, onAssumir, onConcluir }) => {
  const [desfecho, setDesfecho] = useState<Desfecho | ''>('');
  const concluida = pendencia.estado === 'concluida';
  const prazo = descreverPrazo(pendencia.prazo);
  const ehHipotese = pendencia.origem === 'hipotese_sistema';
  const Icone = pendencia.tipo === 'sinal_urgencia' ? AlertTriangle : pendencia.tipo === 'duvida' ? HelpCircle : ClipboardList;

  return (
    <article
      className={`rounded-lg border p-3.5 text-xs space-y-2.5 ${
        concluida ? 'bg-fundo border-linha opacity-80' : ehHipotese ? 'bg-white border-dashed border-urgente-borda' : 'bg-white border-linha'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Icone className={`w-4 h-4 mt-0.5 shrink-0 ${pendencia.tipo === 'sinal_urgencia' ? 'text-urgente' : 'text-verde'}`} aria-hidden />
          <div className="min-w-0">
            <div className="font-semibold text-azul text-sm">
              {ROTULO_TIPO[pendencia.tipo]}
              {nomePaciente && <span className="font-normal text-tinta-suave"> · {nomePaciente}</span>}
            </div>
            <div className="text-tinta-suave">{pendencia.titulo}</div>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${
            ehHipotese ? 'border-dashed border-urgente-borda text-urgente bg-urgente-fundo' : 'border-linha text-azul bg-gelo'
          }`}
        >
          {ehHipotese && <HelpCircle className="w-3 h-3" aria-hidden />}
          {ROTULO_ORIGEM[pendencia.origem]}
        </span>
      </div>

      {pendencia.falaLiteral && (
        <blockquote className="flex gap-2 border-l-4 border-turquesa pl-2.5 py-1 text-azul">
          <Quote className="w-3.5 h-3.5 shrink-0 mt-0.5 text-tinta-suave" aria-hidden />
          <span>
            <span className="block text-[10px] uppercase tracking-wider font-semibold text-tinta-suave">Fala do paciente</span>
            {pendencia.falaLiteral}
          </span>
        </blockquote>
      )}

      {pendencia.motivo && <p className="text-tinta-suave">{pendencia.motivo}</p>}
      {pendencia.tipo === 'sinal_urgencia' && (
        <p className="text-tinta-suave">
          {pendencia.confirmadaPeloPaciente
            ? 'O paciente pediu para encaminhar este relato.'
            : 'O paciente viu o aviso de urgência do hospital; ainda não pediu encaminhamento.'}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-tinta-suave">
        <span>Destino: <strong className="text-azul">{ROTULO_PAPEL[pendencia.papelDestino]}</strong></span>
        <span>Criada em {quando(pendencia.criadaEm)}</span>
        {!concluida && (
          <span className={`inline-flex items-center gap-1 font-semibold ${prazo.atrasada ? 'text-urgente' : 'text-azul'}`}>
            <Clock className="w-3 h-3" aria-hidden />
            Prazo do serviço: {prazo.texto}
          </span>
        )}
        <span>
          Responsável: <strong className="text-azul">{pendencia.responsavel ?? 'ninguém assumiu'}</strong>
        </span>
      </div>

      {concluida ? (
        <div className="flex items-center gap-1.5 text-azul font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5 text-verde" aria-hidden />
          Revisado por {pendencia.concluidaPor} em {quando(pendencia.concluidaEm!)} ·{' '}
          {pendencia.desfecho ? ROTULO_DESFECHO[pendencia.desfecho] : ''}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {pendencia.estado === 'aberta' && (
            <button
              type="button"
              onClick={() => onAssumir(pendencia.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-verde hover:bg-verde-escuro text-white font-semibold cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" aria-hidden />
              Assumir
            </button>
          )}
          <label className="sr-only" htmlFor={`desfecho-${pendencia.id}`}>
            Desfecho da revisão
          </label>
          <select
            id={`desfecho-${pendencia.id}`}
            value={desfecho}
            onChange={(e) => setDesfecho(e.target.value as Desfecho)}
            className="px-2 py-1.5 rounded-lg border border-linha bg-white text-azul"
          >
            <option value="">Desfecho da revisão…</option>
            {(Object.keys(ROTULO_DESFECHO) as Desfecho[]).map((d) => (
              <option key={d} value={d}>
                {ROTULO_DESFECHO[d]}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!desfecho}
            onClick={() => desfecho && onConcluir(pendencia.id, desfecho)}
            className="px-3 py-1.5 rounded-lg border border-verde text-verde font-semibold hover:bg-gelo disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Concluir revisão
          </button>
        </div>
      )}
    </article>
  );
};
