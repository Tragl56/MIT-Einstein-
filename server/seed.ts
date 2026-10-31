// Seed fictício da demo. Todos os nomes, documentos, telefones e planos são inventados.
// Maria é a protagonista do roteiro do OncoFlow; José, Renato e Ana vêm do protótipo IRIS.
// As respostas clínicas que o IRIS dava automaticamente agora aparecem como mensagens de
// profissionais: no OncoFlow, orientação clínica é da equipe, nunca da Lia.

import type { Mensagem, Paciente, Pendencia, UsuarioEquipe } from '../src/types';
import { CONFIG_SERVICO } from './configServico';
import { PLANOS_IRIS } from './planosIris';
import { diaRelativo, horarioDe, proximoDiaDaSemana, somarHoras } from './util';

export const USUARIOS_EQUIPE: UsuarioEquipe[] = [
  {
    id: 'usr-camila',
    nome: 'Dra. Camila Ribeiro',
    cargo: 'Médica oncologista · CRM 145.892 (fictício)',
    email: 'camila.oncologia@hospital-ficticio.org',
    papel: 'medico',
  },
  {
    id: 'usr-rodrigo',
    nome: 'Enf. Rodrigo Mendes',
    cargo: 'Enfermeiro oncológico · COREN 234.567 (fictício)',
    email: 'rodrigo.enfermagem@hospital-ficticio.org',
    papel: 'enfermagem',
  },
  {
    id: 'usr-carla',
    nome: 'Carla Menezes',
    cargo: 'Navegadora de pacientes',
    email: 'carla.navegacao@hospital-ficticio.org',
    papel: 'navegacao',
  },
];

// Sessões da demo. Em produção o paciente vem do token de autenticação, nunca da URL.
export const SESSOES_PACIENTE: Record<string, string> = {
  'demo-maria': 'pac-maria',
};

function minutosAtras(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString();
}

let seq = 0;
function msg(
  autor: Mensagem['autor'],
  nomeAutor: string,
  texto: string,
  em: string,
  extra: Partial<Mensagem> = {}
): Mensagem {
  seq += 1;
  return {
    id: `seed-m${seq}`,
    autor,
    nomeAutor,
    texto,
    em,
    horario: horarioDe(em),
    visivelPaciente: true,
    ...extra,
  };
}

const APRESENTACAO_LIA =
  'Olá, eu sou a Lia, assistente virtual do OncoFlow. Estou aqui para ajudar você a organizar sua jornada de cuidado. Podemos conversar sempre que precisar.';

export function criarSeed(): { pacientes: Paciente[]; pendencias: Pendencia[] } {
  seq = 0;
  const consultaMaria = proximoDiaDaSemana(2, 14); // próxima terça, 14h (mockup do conceito)
  const examesMaria = proximoDiaDaSemana(4, 7, 30); // próxima quinta, 7h30

  const maria: Paciente = {
    id: 'pac-maria',
    nome: 'Maria Oliveira Costa',
    idade: 34,
    diagnosticoResumido: 'Carcinoma de mama invasivo, recém-diagnosticado. Estadiamento em andamento.',
    esquemaResumido: 'A definir após a consulta oncológica e os exames pré-tratamento.',
    cicloAtual: 'Pré-tratamento',
    ecog: 'ECOG 0',
    ultimaInteracao: 'Ontem',
    planoAtualizadoEm: '',
    planoTerapeuticoTexto:
      'Paciente: Maria Oliveira Costa, 34 anos (dados fictícios).\n\nPlano terapêutico ainda não definido. Consulta oncológica em andamento; exames pré-tratamento solicitados. Registrar dúvidas da paciente para discussão na consulta.',
    modoConversa: 'lia',
    jornada: [
      {
        id: 'et-m1',
        titulo: 'Diagnóstico registrado',
        descricao: 'Seu diagnóstico foi registrado pela equipe.',
        estado: 'concluida',
        responsavel: 'Dra. Camila Ribeiro',
      },
      {
        id: 'et-m2',
        titulo: 'Consulta oncológica',
        descricao: 'Conversa com a oncologista para definir os próximos passos do tratamento.',
        estado: 'em_andamento',
        responsavel: 'Dra. Camila Ribeiro',
        oQueFazer: 'Leve seus exames anteriores e a lista dos remédios que você usa.',
      },
      {
        id: 'et-m3',
        titulo: 'Exames pré-tratamento',
        descricao: 'Exames de sangue pedidos pela equipe antes de começar o tratamento.',
        estado: 'aguardando',
        responsavel: 'Navegação · Carla Menezes',
        oQueFazer: 'Siga as orientações de preparo que aparecem na sua agenda.',
      },
      {
        id: 'et-m4',
        titulo: 'Início do tratamento',
        descricao: 'Será marcado depois da consulta e dos exames.',
        estado: 'futura',
      },
      {
        id: 'et-m5',
        titulo: 'Acompanhamento',
        descricao: 'Consultas e check-ins ao longo do tratamento.',
        estado: 'futura',
      },
    ],
    agenda: [
      {
        id: 'ag-m1',
        titulo: 'Consulta com oncologista',
        tipo: 'consulta',
        dataHora: consultaMaria,
        local: 'Ambulatório de Oncologia',
        profissional: 'Dra. Camila Ribeiro',
        preparo:
          'Leve um documento com foto, seus exames anteriores e a lista dos remédios que você usa. Chegue 20 minutos antes. (Orientação institucional fictícia.)',
      },
      {
        id: 'ag-m2',
        titulo: 'Exames de sangue pré-tratamento',
        tipo: 'exame',
        dataHora: examesMaria,
        local: 'Laboratório · térreo',
        preparo:
          'Jejum de 8 horas. Você pode beber água. Leve o pedido do exame e um documento com foto. (Orientação institucional fictícia.)',
      },
    ],
    documentos: [
      {
        id: 'doc-m1',
        titulo: 'Resultado do hemograma',
        tipo: 'resultado',
        data: diaRelativo(-20, 10),
        texto:
          'Hemograma completo realizado no laboratório do hospital. O resultado foi revisado pela Dra. Camila Ribeiro e será conversado com você na próxima consulta. (Documento fictício.)',
        liberadoPor: 'Dra. Camila Ribeiro',
      },
      {
        id: 'doc-m2',
        titulo: 'Orientações para a primeira consulta',
        tipo: 'orientacao',
        data: diaRelativo(-5, 15),
        texto:
          'Anote suas dúvidas antes da consulta. Você pode levar uma pessoa de confiança. Se precisar remarcar, peça pelo app ou pela Lia: a equipe analisa e responde por aqui. (Orientação institucional fictícia.)',
        liberadoPor: 'Carla Menezes · Navegação',
      },
    ],
    lembretes: [],
    checkins: [
      { id: 'ck-m1', em: diaRelativo(-6, 19), opcoes: ['bem'], origem: 'visual' },
      { id: 'ck-m2', em: diaRelativo(-3, 20), opcoes: ['bem'], origem: 'visual' },
      {
        id: 'ck-m3',
        em: diaRelativo(-1, 21),
        opcoes: ['cansaco'],
        texto: 'Dormi pouco essa semana.',
        origem: 'visual',
      },
    ],
    mensagens: [msg('lia', 'Lia', APRESENTACAO_LIA, diaRelativo(-1, 9))],
  };

  const jose: Paciente = {
    id: 'pac-001',
    nome: 'José Pereira da Silva',
    idade: 64,
    diagnosticoResumido:
      'Carcinoma de pulmão não pequenas células, estágio IV, mutação EGFR positiva.',
    esquemaResumido: 'Carboplatina + Pemetrexede a cada 21 dias + Gefitinibe contínuo.',
    cicloAtual: 'D8 do ciclo 2',
    ecog: 'ECOG 1',
    ultimaInteracao: 'Hoje',
    planoAtualizadoEm: '25/08/2026 08:30',
    planoTerapeuticoTexto: PLANOS_IRIS['pac-001'],
    modoConversa: 'lia',
    jornada: [
      { id: 'et-j1', titulo: 'Diagnóstico registrado', descricao: '', estado: 'concluida' },
      { id: 'et-j2', titulo: 'Tratamento · ciclo 2', descricao: '', estado: 'em_andamento' },
      { id: 'et-j3', titulo: 'Ciclo 3', descricao: '', estado: 'futura' },
    ],
    agenda: [
      {
        id: 'ag-j1',
        titulo: 'Quimioterapia · ciclo 3',
        tipo: 'consulta',
        dataHora: diaRelativo(13, 8),
        local: 'Central de quimioterapia',
      },
    ],
    documentos: [],
    lembretes: [],
    checkins: [
      {
        id: 'ck-j1',
        em: minutosAtras(26 * 60),
        opcoes: ['dor'],
        texto: 'Dor nas costas desde ontem à noite.',
        origem: 'voz',
      },
    ],
    mensagens: [
      msg('lia', 'Lia', 'Bom dia, Sr. José. Como posso ajudar hoje?', minutosAtras(95)),
      msg(
        'paciente',
        'José Pereira da Silva',
        'Bom dia! Estou me sentindo bem hoje, graças a Deus. Consegui tomar meu café e fiz uma caminhada leve no quintal.',
        minutosAtras(81)
      ),
      msg(
        'profissional',
        'Dra. Camila Ribeiro',
        'Que bom, Sr. José. Continue tomando o gefitinibe no horário de sempre e bebendo bastante água. Qualquer mancha na pele ou febre, avise pelo app.',
        minutosAtras(70)
      ),
    ],
  };

  const renato: Paciente = {
    id: 'pac-002',
    nome: 'Renato Oliveira Santos',
    idade: 57,
    diagnosticoResumido: 'Adenocarcinoma de cólon sigmóide, ressecado, pT3N1M0.',
    esquemaResumido: 'FOLFOX a cada 14 dias, 12 ciclos previstos, com bomba de infusão elastomérica.',
    cicloAtual: 'D3 do ciclo 4',
    ecog: 'ECOG 0',
    ultimaInteracao: 'Hoje',
    planoAtualizadoEm: '24/08/2026 16:10',
    planoTerapeuticoTexto: PLANOS_IRIS['pac-002'],
    modoConversa: 'lia',
    jornada: [
      { id: 'et-r1', titulo: 'Cirurgia', descricao: '', estado: 'concluida' },
      { id: 'et-r2', titulo: 'Adjuvância · ciclo 4 de 12', descricao: '', estado: 'em_andamento' },
    ],
    agenda: [
      {
        id: 'ag-r1',
        titulo: 'Quimioterapia · ciclo 5',
        tipo: 'consulta',
        dataHora: diaRelativo(11, 9),
        local: 'Central de quimioterapia',
      },
    ],
    documentos: [],
    lembretes: [],
    checkins: [{ id: 'ck-r1', em: diaRelativo(-2, 18), opcoes: ['bem'], origem: 'visual' }],
    mensagens: [
      msg(
        'paciente',
        'Renato Oliveira Santos',
        'Bom dia! A bomba correu normal e estou indo retirar agora. Senti um formigamento leve na ponta dos dedos ao pegar uma fruta na geladeira, mas já passou.',
        minutosAtras(330)
      ),
      msg(
        'profissional',
        'Enf. Rodrigo Mendes',
        'Bom dia, Renato. Esse formigamento com o frio é esperado com a oxaliplatina. Evite bebidas e superfícies geladas nos próximos dias. Te esperamos para a retirada.',
        minutosAtras(318)
      ),
      msg(
        'paciente',
        'Renato Oliveira Santos',
        'Não vou conseguir ir no ciclo 5 nesse dia, tenho um compromisso de trabalho.',
        minutosAtras(300)
      ),
      msg(
        'lia',
        'Lia',
        'Registrei seu pedido de reagendamento da quimioterapia do ciclo 5. A equipe vai analisar e você verá a resposta aqui.',
        minutosAtras(299),
        { status: 'registrado' }
      ),
    ],
  };

  const ana: Paciente = {
    id: 'pac-003',
    nome: 'Ana Silva',
    idade: 42,
    diagnosticoResumido: 'Carcinoma de mama invasivo, cT2N1M0, Luminal B HER2-.',
    esquemaResumido: 'AC dose densa a cada 14 dias + Filgrastim SC D2-D7.',
    cicloAtual: 'D5 do ciclo 3',
    ecog: 'ECOG 1',
    ultimaInteracao: 'Hoje',
    planoAtualizadoEm: '25/08/2026 09:00',
    planoTerapeuticoTexto: PLANOS_IRIS['pac-003'],
    modoConversa: 'lia',
    jornada: [
      { id: 'et-a1', titulo: 'Diagnóstico registrado', descricao: '', estado: 'concluida' },
      { id: 'et-a2', titulo: 'Neoadjuvância · ciclo 3', descricao: '', estado: 'em_andamento' },
      { id: 'et-a3', titulo: 'Cirurgia', descricao: '', estado: 'futura' },
    ],
    agenda: [
      {
        id: 'ag-a1',
        titulo: 'Quimioterapia · ciclo 4',
        tipo: 'consulta',
        dataHora: diaRelativo(9, 10),
        local: 'Central de quimioterapia',
      },
    ],
    documentos: [],
    lembretes: [],
    checkins: [
      { id: 'ck-a1', em: diaRelativo(-1, 20), opcoes: ['bem'], origem: 'visual' },
    ],
    mensagens: [
      msg(
        'paciente',
        'Ana Silva',
        'Oi! Hoje estou bem melhor do enjoo. Só uma dor nas costas depois da injeção de ontem, mas tomei a dipirona e aliviou.',
        minutosAtras(150)
      ),
      msg(
        'profissional',
        'Enf. Rodrigo Mendes',
        'Que bom, Ana. Essa dor costuma acontecer com o filgrastim e a dipirona é a medicação indicada no seu plano. Se tiver febre, procure o pronto-atendimento.',
        minutosAtras(140)
      ),
    ],
  };

  const pendencias: Pendencia[] = [
    {
      id: 'pend-seed-1',
      pacienteId: 'pac-001',
      tipo: 'checkin',
      origem: 'regra_servico',
      estado: 'aberta',
      titulo: 'Check-in aguardando revisão',
      falaLiteral: 'Dor nas costas desde ontem à noite.',
      motivo: CONFIG_SERVICO.regrasRevisao[0].descricao,
      papelDestino: 'enfermagem',
      criadaEm: minutosAtras(26 * 60),
      prazo: somarHoras(minutosAtras(26 * 60), 24),
    },
    {
      id: 'pend-seed-2',
      pacienteId: 'pac-002',
      tipo: 'reagendamento',
      origem: 'solicitacao_paciente',
      estado: 'aberta',
      titulo: 'Pedido de reagendamento · Quimioterapia ciclo 5',
      falaLiteral: 'Não vou conseguir ir no ciclo 5 nesse dia, tenho um compromisso de trabalho.',
      confirmadaPeloPaciente: true,
      papelDestino: 'navegacao',
      criadaEm: minutosAtras(299),
      prazo: somarHoras(minutosAtras(299), CONFIG_SERVICO.prazoHorasPorTipo.reagendamento),
    },
  ];

  return { pacientes: [maria, jose, renato, ana], pendencias };
}
