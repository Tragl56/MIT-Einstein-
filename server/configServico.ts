// Configuração do serviço (instituição fictícia). Tudo aqui é DADO definido pelo hospital, não
// regra clínica do código (CLAUDE.md, regra 6). Os valores marcados `exemplo` são ilustrativos e
// precisam ser definidos com o serviço antes de qualquer uso real.

import type { AvisoUrgencia, OpcaoCheckin, PapelEquipe, TipoPendencia } from '../src/types';

export interface RegraRevisaoCheckin {
  id: string;
  descricao: string;
  exemplo: boolean;
  // Dispara quando o check-in tem alguma destas opções...
  seAlgumaOpcao: OpcaoCheckin[];
  // ...em N check-ins seguidos (1 = só o atual).
  emSeguida: number;
  papelDestino: PapelEquipe;
  prazoHoras: number;
}

export interface ConfigServico {
  instituicao: string;
  assistenteNome: string;
  // Termos que mostram o aviso de urgência ao paciente e abrem uma hipótese para a equipe revisar.
  // Comparação por palavra inteira, sem acento, ignorando negações simples ("sem febre").
  termosUrgencia: string[];
  termosUrgenciaExemplo: boolean;
  avisoUrgencia: AvisoUrgencia;
  quemVe: string;
  prazoHorasPorTipo: Record<TipoPendencia, number>;
  papelPorTipo: Record<TipoPendencia, PapelEquipe>;
  regrasRevisao: RegraRevisaoCheckin[];
  minutosRetornoLia: number;
  minutosValidadeConfirmacao: number;
  horaPadraoLembrete: number;
}

export const CONFIG_SERVICO: ConfigServico = {
  instituicao: 'Centro de Oncologia Fictício',
  assistenteNome: 'Lia',
  termosUrgencia: [
    'febre',
    'febril',
    'calafrio',
    'calafrios',
    'muita dor',
    'dor forte',
    'dor muito forte',
    'dor no peito',
    'falta de ar',
    'sem ar',
    'dificuldade para respirar',
    'dificuldade de respirar',
    'sangramento',
    'sangrando',
    'vomitando sangue',
    'tosse com sangue',
    'sangue na urina',
    'sangue nas fezes',
    'desmaiei',
    'desmaio',
    'convulsao',
    'confusao mental',
    'vomitando sem parar',
    'nao paro de vomitar',
    'nao consigo beber',
    'nao aguento mais',
  ],
  termosUrgenciaExemplo: true,
  avisoUrgencia: {
    titulo: 'Este canal não é para emergências',
    texto:
      'Se você estiver com sintomas fortes ou que pioram rápido, procure o pronto-atendimento oncológico do hospital ou ligue para o serviço de emergência.',
    contato: 'Pronto-atendimento oncológico · (00) 0000-0000 (número fictício) · Emergência: 192',
  },
  quemVe:
    'Sua equipe de cuidado (médica, enfermagem e navegação) pode ver esta conversa e seus check-ins para organizar o seu acompanhamento. As respostas da equipe seguem o horário e os prazos do serviço.',
  prazoHorasPorTipo: {
    sinal_urgencia: 4,
    checkin: 24,
    contato_equipe: 24,
    reagendamento: 48,
    duvida: 48,
  },
  papelPorTipo: {
    sinal_urgencia: 'enfermagem',
    checkin: 'enfermagem',
    contato_equipe: 'enfermagem',
    reagendamento: 'navegacao',
    duvida: 'enfermagem',
  },
  regrasRevisao: [
    {
      id: 'regra-dor-nausea',
      descricao: 'Check-in com dor ou náusea → enfermagem revisa em até 24 h',
      exemplo: true,
      seAlgumaOpcao: ['dor', 'nausea'],
      emSeguida: 1,
      papelDestino: 'enfermagem',
      prazoHoras: 24,
    },
    {
      id: 'regra-cansaco-ansiedade',
      descricao: 'Cansaço ou ansiedade em 2 check-ins seguidos → navegação revisa em até 48 h',
      exemplo: true,
      seAlgumaOpcao: ['cansaco', 'ansiedade'],
      emSeguida: 2,
      papelDestino: 'navegacao',
      prazoHoras: 48,
    },
  ],
  minutosRetornoLia: 20,
  minutosValidadeConfirmacao: 2,
  horaPadraoLembrete: 9,
};
