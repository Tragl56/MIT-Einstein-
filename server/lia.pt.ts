// Lia, assistente do OncoFlow Paciente. Substitui a "IRIS automática" do protótipo.
//
// Regras (CLAUDE.md, 3 e 4): a Lia não orienta sobre sintomas, remédios ou resultados; só informa
// o que está no sistema, organiza e encaminha. Ações de escrita passam por confirmação em duas
// fases, e toda resposta usa um dos quatro status: consultado, registrado, encaminhado ou
// confirmado. Os textos saem de modelos por status, nunca de geração livre, e ainda passam por
// `verificarAfirmacoes` antes de chegar ao paciente.
//
// A interpretação do pedido é feita por regras locais (funciona sem rede, como pede o roteiro da
// demo). Um modelo de linguagem pode substituir `classificar` depois, sem mudar o resto.
//
// Versão em português (idioma padrão da demo). lia.en.ts é a mesma lógica em inglês e
// server/lia.ts escolhe pelo idioma da demo: mudanças de regra entram nas duas.

import type { Compromisso, OpcaoCheckin, Paciente, StatusResultado } from '../src/types';
import { ROTULO_OPCAO_CHECKIN } from '../src/types';
import { CONFIG_SERVICO } from './configServico';
import {
  adicionarMensagem,
  criarPendencia,
  definirProposta,
  ErroDominio,
  limparProposta,
  obterPaciente,
  obterPendencia,
  propostaDe,
  registrarCheckin,
  registrarSinalUrgencia,
  type PropostaInterna,
} from './estado';
import { detectarUrgencia } from './urgencia';
import { contemExpressao, dataCurta, dataHoraPorExtenso, diaRelativo, gerarId, agoraISO, normalizar } from './util';

const NOME = CONFIG_SERVICO.assistenteNome;

// ---------------------------------------------------------------------------
// Fala da Lia
// ---------------------------------------------------------------------------

// Verbos que afirmam conclusão. Só podem aparecer com status `confirmado` (princípio 5).
const AFIRMACOES_DE_CONCLUSAO = [
  'remarquei',
  'foi remarcad*',
  'esta remarcad*',
  'esta agendad*',
  'foi agendad*',
  'cancelei',
  'foi cancelad*',
  'vai te ligar',
  'vai ligar',
  'ja resolvi',
  'foi resolvid*',
];

const TEXTO_SEGURO_POR_STATUS: Record<StatusResultado, string> = {
  consultado: 'Essa é a informação que está no sistema agora.',
  registrado: 'Registrei seu pedido. A equipe vai analisar e você verá a resposta aqui.',
  encaminhado: 'Encaminhei para a equipe responsável.',
  confirmado: 'Pronto.',
};

export function verificarAfirmacoes(texto: string, status: StatusResultado | undefined): string {
  if (status === 'confirmado') return texto;
  if (!contemExpressao(normalizar(texto), AFIRMACOES_DE_CONCLUSAO)) return texto;
  return status ? TEXTO_SEGURO_POR_STATUS[status] : 'Ainda não fiz nenhuma alteração.';
}

function falar(
  paciente: Paciente,
  texto: string,
  extra: { status?: StatusResultado; acoes?: { rotulo: string; tipo: 'abrir_documento' | 'abrir_tela'; alvo: string }[] } = {}
): void {
  adicionarMensagem(paciente, {
    autor: 'lia',
    nomeAutor: NOME,
    texto: verificarAfirmacoes(texto, extra.status),
    status: extra.status,
    acoes: extra.acoes,
    visivelPaciente: true,
  });
}

function primeiroNome(paciente: Paciente): string {
  return paciente.nome.split(' ')[0];
}

// "da consulta com oncologista", "dos exames de sangue", "à consulta", "aos exames"
function comArtigo(compromisso: Compromisso, preposicao: 'de' | 'a'): string {
  const titulo = compromisso.titulo.charAt(0).toLowerCase() + compromisso.titulo.slice(1);
  const plural = /^exames\b/i.test(titulo);
  const masculino = plural || /^(exame|retorno)\b/i.test(titulo);
  const artigo =
    preposicao === 'de'
      ? masculino ? (plural ? 'dos' : 'do') : 'da'
      : masculino ? (plural ? 'aos' : 'ao') : 'à';
  return `${artigo} ${titulo}`;
}

const DESCRICAO_FALADA: Record<OpcaoCheckin, string> = {
  bem: 'bem',
  cansaco: 'cansaço',
  dor: 'dor',
  nausea: 'náusea',
  ansiedade: 'preocupação ou ansiedade',
  outro: 'algo diferente',
};

// ---------------------------------------------------------------------------
// Entrada principal
// ---------------------------------------------------------------------------

export function mensagemDoPaciente(pacienteId: string, texto: string, origem: 'texto' | 'voz'): void {
  const paciente = obterPaciente(pacienteId);
  const limpo = texto.trim();
  if (!limpo) throw new ErroDominio(400, 'texto_vazio', 'Escreva ou fale sua mensagem.');

  adicionarMensagem(paciente, {
    autor: 'paciente',
    nomeAutor: paciente.nome,
    texto: limpo,
    origem,
    visivelPaciente: true,
  });

  // 1. Possível urgência, antes de qualquer outra coisa, nos dois modos de atendimento.
  const urgencia = detectarUrgencia(limpo);
  if (urgencia) {
    limparProposta(paciente.id);
    const pendencia = registrarSinalUrgencia(paciente, limpo, urgencia.termo);
    if (paciente.modoConversa === 'lia') {
      definirProposta(paciente, {
        acao: 'relato_urgencia',
        resumo: `Encaminhar seu relato para a equipe de enfermagem: "${limpo}"`,
        rotuloConfirmar: 'Encaminhar relato',
        rotuloRecusar: 'Agora não',
        dados: { pendenciaId: pendencia.id },
      });
      falar(paciente, 'Quer que eu encaminhe esse relato para a sua equipe de enfermagem?');
    }
    return;
  }

  // 2. Com um profissional na conversa, quem responde é ele (como no IRIS).
  if (paciente.modoConversa === 'profissional') return;

  responderComoLia(paciente, limpo, origem);
}

function responderComoLia(paciente: Paciente, texto: string, origem: 'texto' | 'voz'): void {
  const t = normalizar(texto);

  const pendente = propostaDe(paciente.id);
  if (pendente) {
    if (/^(sim|pode|pode sim|confirmo|confirmar|isso|isso mesmo|claro|ok|quero|por favor|pode ser)\b/.test(t)) {
      responderProposta(paciente.id, pendente.token, true);
      return;
    }
    if (/^(nao|agora nao|cancela|cancelar|deixa|nao precisa)\b/.test(t)) {
      responderProposta(paciente.id, pendente.token, false);
      return;
    }
    limparProposta(paciente.id);
  }

  const intencao = classificar(t);
  switch (intencao.tipo) {
    case 'duvida_clinica':
      return duvidaClinica(paciente, texto);
    case 'contato':
      return propostaContato(paciente, texto);
    case 'reagendamento':
      return propostaReagendamento(paciente, texto, t);
    case 'lembrete':
      return criarLembrete(paciente, t);
    case 'checkin_iniciar':
      return falar(
        paciente,
        'Claro. Como você está se sentindo hoje? Pode me contar com suas palavras ou escolher uma opção na tela Como estou?',
        { acoes: [{ rotulo: 'Abrir Como estou?', tipo: 'abrir_tela', alvo: 'como-estou' }] }
      );
    case 'checkin_texto':
      return propostaCheckin(paciente, texto, intencao.opcoes, origem);
    case 'preparo':
      return consultarPreparo(paciente, t);
    case 'documentos':
      return consultarDocumentos(paciente);
    case 'agenda':
      return consultarAgenda(paciente, t);
    case 'jornada':
      return consultarJornada(paciente);
    case 'saudacao':
      return falar(
        paciente,
        `Olá, ${primeiroNome(paciente)}. Como posso ajudar? Posso consultar sua agenda, sua jornada e seus documentos, registrar como você está ou chamar a equipe.`
      );
    case 'agradecimento':
      return falar(paciente, `Por nada, ${primeiroNome(paciente)}. Se precisar, é só chamar.`);
    default:
      return falar(
        paciente,
        'Ainda não sei ajudar com isso. Posso consultar sua agenda, sua jornada e seus documentos, registrar como você está ou pedir contato da equipe.'
      );
  }
}

// ---------------------------------------------------------------------------
// Interpretação do pedido (regras locais)
// ---------------------------------------------------------------------------

type Intencao =
  | { tipo: 'duvida_clinica' | 'contato' | 'reagendamento' | 'lembrete' | 'checkin_iniciar' }
  | { tipo: 'checkin_texto'; opcoes: OpcaoCheckin[] }
  | { tipo: 'preparo' | 'documentos' | 'agenda' | 'jornada' | 'saudacao' | 'agradecimento' | 'desconhecida' };

const SINONIMOS_CHECKIN: Record<Exclude<OpcaoCheckin, 'outro'>, string[]> = {
  cansaco: ['cansad*', 'exaust*', 'sem energia', 'fadiga', 'fraca', 'fraco'],
  dor: ['dor', 'dores', 'doendo', 'doi'],
  nausea: ['enjo*', 'nausea*', 'enjoad*', 'vomit*'],
  ansiedade: ['ansios*', 'preocupad*', 'nervos*', 'angustiad*', 'com medo', 'triste'],
  bem: ['estou bem', 'to bem', 'me sentindo bem', 'me sinto bem', 'estou otim*', 'bem hoje'],
};

function opcoesDoTexto(t: string): OpcaoCheckin[] {
  return (Object.keys(SINONIMOS_CHECKIN) as (keyof typeof SINONIMOS_CHECKIN)[]).filter((opcao) =>
    contemExpressao(t, SINONIMOS_CHECKIN[opcao])
  );
}

export function classificar(t: string): Intencao {
  if (
    contemExpressao(t, [
      'posso tomar',
      'devo tomar',
      'posso parar',
      'parar o remedio',
      'e normal',
      'isso e normal',
      'o que significa',
      'e grave',
      'isso e grave',
      'qual remedio',
      'que remedio',
      'qual dose',
      'aumentar a dose',
      'diminuir a dose',
      'tomar mais um',
    ])
  ) {
    return { tipo: 'duvida_clinica' };
  }
  if (
    contemExpressao(t, [
      'falar com a enfermeira',
      'falar com o enfermeiro',
      'falar com minha enfermeira',
      'falar com meu enfermeiro',
      'falar com a equipe',
      'falar com alguem',
      'falar com a medica',
      'falar com o medico',
      'falar com minha medica',
      'falar com meu medico',
      'falar com a doutora',
      'falar com o doutor',
      'falar com uma pessoa',
      'falar com a navegacao',
      'preciso falar com',
      'quero falar com',
    ])
  ) {
    return { tipo: 'contato' };
  }
  if (
    contemExpressao(t, [
      'nao posso ir',
      'nao vou poder ir',
      'nao vou conseguir ir',
      'nao consigo ir',
      'remarcar',
      'reagendar',
      'mudar a consulta',
      'mudar minha consulta',
      'trocar a data',
      'trocar o horario',
      'trocar o dia',
      'desmarcar',
      'cancelar a consulta',
    ])
  ) {
    return { tipo: 'reagendamento' };
  }
  if (contemExpressao(t, ['me lembr*', 'lembrete', 'me avis*', 'lembrar'])) return { tipo: 'lembrete' };
  if (
    contemExpressao(t, [
      'como estou me sentindo',
      'contar como estou',
      'registrar como estou',
      'fazer check in',
      'fazer o check in',
      'check in',
      'checkin',
    ])
  ) {
    return { tipo: 'checkin_iniciar' };
  }
  const opcoes = opcoesDoTexto(t);
  if (opcoes.length > 0) return { tipo: 'checkin_texto', opcoes };
  if (
    contemExpressao(t, [
      'preparo',
      'preparar',
      'jejum',
      'como vai ser',
      'como sera',
      'como e o exame',
      'o que levar',
      'o que devo levar',
      'o que preciso levar',
    ])
  ) {
    return { tipo: 'preparo' };
  }
  if (contemExpressao(t, ['documento*', 'resultado*', 'laudo*', 'exame de sangue', 'hemograma', 'meus exames'])) {
    return { tipo: 'documentos' };
  }
  if (
    contemExpressao(t, ['proxima consulta', 'consulta*', 'agenda', 'quando', 'horario', 'que horas', 'compromisso*', 'marcad*', 'exame*'])
  ) {
    return { tipo: 'agenda' };
  }
  if (
    contemExpressao(t, ['jornada', 'proxima etapa', 'proximo passo', 'proximos passos', 'etapa*', 'o que vem agora', 'o que falta'])
  ) {
    return { tipo: 'jornada' };
  }
  if (/^(oi|ola|oie|bom dia|boa tarde|boa noite|e ai|opa|alo)\b/.test(t)) return { tipo: 'saudacao' };
  if (contemExpressao(t, ['obrigad*', 'valeu', 'agradeco'])) return { tipo: 'agradecimento' };
  return { tipo: 'desconhecida' };
}

// ---------------------------------------------------------------------------
// Informar (status `consultado`)
// ---------------------------------------------------------------------------

function proximo(paciente: Paciente, tipo?: Compromisso['tipo']): Compromisso | undefined {
  const agora = Date.now();
  return [...paciente.agenda]
    .filter((c) => new Date(c.dataHora).getTime() > agora && (!tipo || c.tipo === tipo))
    .sort((a, b) => a.dataHora.localeCompare(b.dataHora))[0];
}

function lembreteExistente(paciente: Paciente, compromissoId: string): boolean {
  return paciente.lembretes.some((l) => l.compromissoId === compromissoId);
}

function consultarAgenda(paciente: Paciente, t: string): void {
  const tipo = contemExpressao(t, ['consulta*']) ? 'consulta' : contemExpressao(t, ['exame*']) ? 'exame' : undefined;
  const compromisso = proximo(paciente, tipo) ?? proximo(paciente);
  if (!compromisso) {
    falar(paciente, 'Não encontrei compromissos marcados na sua agenda.', { status: 'consultado' });
    return;
  }
  const quando = dataHoraPorExtenso(compromisso.dataHora);
  const texto =
    compromisso.tipo === 'consulta'
      ? `Sua próxima consulta é ${quando}, no ${compromisso.local}.`
      : `Seu próximo compromisso é ${compromisso.titulo}: ${quando}, no ${compromisso.local}.`;
  falar(paciente, texto, { status: 'consultado' });

  if (!lembreteExistente(paciente, compromisso.id)) {
    definirProposta(paciente, {
      acao: 'lembrete',
      resumo: `Criar lembrete um dia antes ${comArtigo(compromisso, 'de')}`,
      rotuloConfirmar: 'Sim, por favor',
      rotuloRecusar: 'Agora não',
      dados: { compromissoId: compromisso.id },
    });
    falar(paciente, 'Quer que eu te lembre um dia antes?');
  }
}

function consultarJornada(paciente: Paciente): void {
  const atual = paciente.jornada.find((e) => e.estado === 'em_andamento');
  const seguinte = paciente.jornada.find((e) => e.estado === 'proxima' || e.estado === 'aguardando');
  const partes: string[] = [];
  if (atual) partes.push(`Agora você está na etapa ${atual.titulo}.`);
  if (seguinte) {
    partes.push(
      `A próxima é ${seguinte.titulo}${seguinte.estado === 'aguardando' ? ', que está aguardando' : ''}.`
    );
    if (seguinte.oQueFazer) partes.push(seguinte.oQueFazer);
  }
  if (partes.length === 0) partes.push('Não encontrei etapas cadastradas na sua jornada.');
  falar(paciente, partes.join(' '), {
    status: 'consultado',
    acoes: [{ rotulo: 'Ver minha jornada', tipo: 'abrir_tela', alvo: 'jornada' }],
  });
}

function consultarDocumentos(paciente: Paciente): void {
  const recente = [...paciente.documentos].sort((a, b) => b.data.localeCompare(a.data))[0];
  if (!recente) {
    falar(paciente, 'Ainda não há documentos liberados para você.', { status: 'consultado' });
    return;
  }
  falar(
    paciente,
    `Seu documento mais recente é ${recente.titulo}, liberado em ${dataCurta(recente.data)} por ${recente.liberadoPor}. Posso abrir o documento para você ler ou ouvir.`,
    {
      status: 'consultado',
      acoes: [
        { rotulo: 'Ver o documento completo', tipo: 'abrir_documento', alvo: recente.id },
        { rotulo: 'Meus documentos', tipo: 'abrir_tela', alvo: 'documentos' },
      ],
    }
  );
}

function consultarPreparo(paciente: Paciente, t: string): void {
  const tipo = contemExpressao(t, ['consulta*']) ? 'consulta' : 'exame';
  const compromisso = proximo(paciente, tipo) ?? proximo(paciente);
  if (compromisso?.preparo) {
    falar(
      paciente,
      `Para ${compromisso.titulo}, ${dataHoraPorExtenso(compromisso.dataHora)}, a orientação do hospital é: ${compromisso.preparo}`,
      { status: 'consultado' }
    );
    return;
  }
  definirProposta(paciente, {
    acao: 'duvida',
    resumo: 'Pedir à equipe as instruções de preparo do seu próximo exame',
    rotuloConfirmar: 'Pedir à equipe',
    rotuloRecusar: 'Agora não',
    dados: { texto: 'Instruções de preparo do próximo exame' },
  });
  falar(paciente, 'Ainda não tenho as instruções validadas para esse exame. Quer que eu peça para a equipe?');
}

// ---------------------------------------------------------------------------
// Organizar e encaminhar (propostas confirmadas pelo paciente)
// ---------------------------------------------------------------------------

function duvidaClinica(paciente: Paciente, texto: string): void {
  definirProposta(paciente, {
    acao: 'duvida',
    resumo: `Registrar sua dúvida para a equipe: "${texto}"`,
    rotuloConfirmar: 'Registrar dúvida',
    rotuloRecusar: 'Agora não',
    dados: { texto },
  });
  falar(
    paciente,
    'Essa pergunta é importante para a sua equipe de saúde. Eu não respondo sobre remédios, sintomas ou resultados. Quer que eu registre sua dúvida para eles?'
  );
}

function propostaContato(paciente: Paciente, texto: string): void {
  definirProposta(paciente, {
    acao: 'contato_equipe',
    resumo: 'Pedir que a equipe de enfermagem entre em contato com você',
    rotuloConfirmar: 'Pedir contato',
    rotuloRecusar: 'Não, voltar',
    dados: { texto },
  });
  falar(paciente, 'Posso pedir para a equipe de enfermagem entrar em contato com você?');
}

function propostaReagendamento(paciente: Paciente, texto: string, t: string): void {
  const compromisso = contemExpressao(t, ['exame*']) ? proximo(paciente, 'exame') : proximo(paciente, 'consulta') ?? proximo(paciente);
  if (!compromisso) {
    falar(paciente, 'Não encontrei compromissos marcados para reagendar.', { status: 'consultado' });
    return;
  }
  const quando = dataHoraPorExtenso(compromisso.dataHora);
  definirProposta(paciente, {
    acao: 'reagendamento',
    resumo: `Abrir pedido de reagendamento ${comArtigo(compromisso, 'de')}, ${quando}`,
    rotuloConfirmar: 'Abrir pedido',
    rotuloRecusar: 'Não, voltar',
    dados: { compromissoId: compromisso.id, texto },
  });
  falar(
    paciente,
    `Entendi: você não pode ir ${comArtigo(compromisso, 'a')}, ${quando}. Posso abrir um pedido de reagendamento para a equipe analisar?`
  );
}

function propostaCheckin(paciente: Paciente, texto: string, opcoes: OpcaoCheckin[], origem: 'texto' | 'voz'): void {
  const sintomas = opcoes.filter((o) => o !== 'bem').map((o) => DESCRICAO_FALADA[o]);
  const descricao =
    sintomas.length === 0
      ? 'bem'
      : `com ${sintomas.length > 1 ? `${sintomas.slice(0, -1).join(', ')} e ${sintomas[sintomas.length - 1]}` : sintomas[0]}`;
  definirProposta(paciente, {
    acao: 'checkin',
    resumo: `Registrar no seu check-in de hoje: ${opcoes.map((o) => ROTULO_OPCAO_CHECKIN[o]).join(', ')} · "${texto}"`,
    rotuloConfirmar: 'Registrar check-in',
    rotuloRecusar: 'Agora não',
    dados: { opcoes, texto, origem },
  });
  falar(paciente, `Entendi: hoje você está ${descricao}. Quer que eu registre isso no seu check-in de hoje?`);
}

function criarLembrete(paciente: Paciente, t: string): void {
  const compromisso = contemExpressao(t, ['exame*']) ? proximo(paciente, 'exame') : proximo(paciente, 'consulta') ?? proximo(paciente);
  if (!compromisso) {
    falar(paciente, 'Não encontrei compromissos marcados para criar um lembrete.', { status: 'consultado' });
    return;
  }
  executarLembrete(paciente, compromisso);
}

function executarLembrete(paciente: Paciente, compromisso: Compromisso): void {
  if (lembreteExistente(paciente, compromisso.id)) {
    falar(paciente, `Você já tem um lembrete para ${compromisso.titulo}.`, { status: 'consultado' });
    return;
  }
  const diasAteCompromisso = Math.floor(
    (new Date(compromisso.dataHora).getTime() - new Date(diaRelativo(0, 0)).getTime()) / 86_400_000
  );
  const quando = diaRelativo(Math.max(diasAteCompromisso - 1, 0), CONFIG_SERVICO.horaPadraoLembrete);
  paciente.lembretes.push({
    id: gerarId('lem'),
    texto: `${compromisso.titulo} amanhã, ${dataHoraPorExtenso(compromisso.dataHora)}, no ${compromisso.local}`,
    dataHora: quando,
    compromissoId: compromisso.id,
    criadoEm: agoraISO(),
  });
  falar(paciente, `Pronto, o lembrete está criado para ${dataHoraPorExtenso(quando)}.`, { status: 'confirmado' });
}

export function responderProposta(pacienteId: string, token: string, aceitar: boolean): void {
  const paciente = obterPaciente(pacienteId);
  const proposta = propostaDe(paciente.id);
  if (!proposta || proposta.token !== token) {
    throw new ErroDominio(409, 'proposta_inexistente', 'Essa confirmação não está mais disponível.');
  }
  limparProposta(paciente.id);
  adicionarMensagem(paciente, {
    autor: 'paciente',
    nomeAutor: paciente.nome,
    texto: aceitar ? proposta.rotuloConfirmar : proposta.rotuloRecusar,
    visivelPaciente: true,
  });

  if (new Date(proposta.expiraEm).getTime() < Date.now()) {
    falar(paciente, 'Essa confirmação expirou e eu não fiz nenhuma alteração. Quer que eu prepare de novo?');
    return;
  }
  if (!aceitar) {
    falar(paciente, 'Tudo bem, não fiz nenhuma alteração. Se mudar de ideia, é só me pedir.');
    return;
  }
  executar(paciente, proposta);
}

function executar(paciente: Paciente, proposta: PropostaInterna): void {
  const dados = proposta.dados;
  const texto = typeof dados.texto === 'string' ? dados.texto : undefined;
  switch (proposta.acao) {
    case 'lembrete': {
      const compromisso = paciente.agenda.find((c) => c.id === dados.compromissoId);
      if (compromisso) executarLembrete(paciente, compromisso);
      return;
    }
    case 'reagendamento': {
      const compromisso = paciente.agenda.find((c) => c.id === dados.compromissoId);
      if (!compromisso) return;
      criarPendencia(paciente, {
        tipo: 'reagendamento',
        origem: 'solicitacao_paciente',
        titulo: `Pedido de reagendamento · ${compromisso.titulo}`,
        falaLiteral: texto,
        confirmadaPeloPaciente: true,
      });
      falar(
        paciente,
        `Registrei seu pedido de reagendamento ${comArtigo(compromisso, 'de')}, ${dataHoraPorExtenso(compromisso.dataHora)}. A equipe vai analisar e você verá a resposta aqui.`,
        { status: 'registrado' }
      );
      return;
    }
    case 'contato_equipe': {
      criarPendencia(paciente, {
        tipo: 'contato_equipe',
        origem: 'solicitacao_paciente',
        titulo: 'Pedido de contato com a equipe',
        falaLiteral: texto,
        confirmadaPeloPaciente: true,
      });
      falar(
        paciente,
        `Encaminhei seu pedido para a equipe de enfermagem. O prazo de retorno combinado pelo serviço é de até ${CONFIG_SERVICO.prazoHorasPorTipo.contato_equipe} horas.`,
        { status: 'encaminhado' }
      );
      return;
    }
    case 'duvida': {
      criarPendencia(paciente, {
        tipo: 'duvida',
        origem: 'solicitacao_paciente',
        titulo: 'Dúvida para a equipe',
        falaLiteral: texto,
        confirmadaPeloPaciente: true,
      });
      falar(paciente, 'Registrei sua dúvida para a equipe. A resposta vai aparecer aqui.', { status: 'registrado' });
      return;
    }
    case 'relato_urgencia': {
      const pendencia = obterPendencia(String(dados.pendenciaId));
      pendencia.confirmadaPeloPaciente = true;
      falar(
        paciente,
        `Encaminhei seu relato para a equipe de enfermagem. O prazo de retorno combinado pelo serviço é de até ${CONFIG_SERVICO.prazoHorasPorTipo.sinal_urgencia} horas. Se piorar, não espere: procure o pronto-atendimento.`,
        { status: 'encaminhado' }
      );
      return;
    }
    case 'checkin': {
      const opcoes = (dados.opcoes as OpcaoCheckin[]) ?? [];
      const origem = dados.origem === 'voz' ? 'voz' : 'visual';
      const { urgencia } = registrarCheckin(paciente, opcoes, texto, origem);
      if (!urgencia) {
        falar(paciente, 'Registrei seu check-in de hoje. Sua equipe vai ver conforme o combinado com o serviço.', {
          status: 'registrado',
        });
      }
      return;
    }
  }
}
