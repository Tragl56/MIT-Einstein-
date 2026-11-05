// Estado da demo em memória, compartilhado pelo OncoFlow Pro (equipe) e pelo OncoFlow Paciente.
// No IRIS esse estado vivia dentro do React; aqui ele fica no servidor para que a equipe e a
// paciente vejam os mesmos dados em abas ou aparelhos diferentes. A persistência da demonstração
// é instalada pelo servidor; somente POST /api/demo/reset volta ao seed.

import type {
  Checkin,
  Desfecho,
  Mensagem,
  OpcaoCheckin,
  Paciente,
  Pendencia,
  SituacaoPaciente,
  TipoPendencia,
  UsuarioEquipe,
  GestaoPendenciaInput,
  EventoPendencia,
} from '../src/types';
import { CONFIG_SERVICO, type RegraRevisaoCheckin } from './configServico';
import { criarSeed, SESSOES_PACIENTE, USUARIOS_EQUIPE } from './seed';
import { detectarUrgencia } from './urgencia';
import { agoraISO, gerarId, horarioDe, somarHoras } from './util';
import { iniciarVideochamada as gerarSalaVideochamada } from '../src/services/chamadaService';
import { definirIdioma, ehIdioma, idiomaAtual, type Idioma } from '../src/idioma';
import { tr } from '../src/idioma';

export class ErroDominio extends Error {
  constructor(
    public status: number,
    public codigo: string,
    mensagem: string
  ) {
    super(mensagem);
  }
}

export type AcaoProposta =
  | 'reagendamento'
  | 'contato_equipe'
  | 'duvida'
  | 'relato_urgencia'
  | 'checkin'
  | 'lembrete';

export interface PropostaInterna {
  token: string;
  pacienteId: string;
  acao: AcaoProposta;
  resumo: string;
  rotuloConfirmar: string;
  rotuloRecusar: string;
  expiraEm: string;
  dados: Record<string, unknown>;
}

interface EventoAuditoria {
  em: string;
  ator: string;
  acao: string;
  alvo: string;
}

const estado = {
  versao: 1,
  pacientes: [] as Paciente[],
  pendencias: [] as Pendencia[],
  propostas: new Map<string, PropostaInterna>(),
  auditoria: [] as EventoAuditoria[],
};

// `idioma` é opcional: estados salvos antes da demo bilíngue não têm o campo e foram gerados em inglês.
// `propostas` guarda as confirmações pendentes da Lia para sobreviverem a um reinício.
export type EstadoSalvo = Pick<typeof estado, 'versao' | 'pacientes' | 'pendencias' | 'auditoria'> & {
  idioma?: Idioma;
  propostas?: [string, PropostaInterna][];
};
const aoResetar = new Set<() => void>();
export function observarReset(callback: () => void): () => void {
  aoResetar.add(callback);
  return () => aoResetar.delete(callback);
}
export function exportarEstado(): EstadoSalvo {
  return { versao: estado.versao, idioma: idiomaAtual(), pacientes: estado.pacientes, pendencias: estado.pendencias, auditoria: estado.auditoria, propostas: [...estado.propostas] };
}
export function importarEstado(salvo: EstadoSalvo): void {
  if (!salvo || !Array.isArray(salvo.pacientes) || !salvo.pacientes.length || !Array.isArray(salvo.pendencias) || !Array.isArray(salvo.auditoria)) {
    throw new Error('Invalid saved fictional demo state. Restore the file or reset it explicitly.');
  }
  if (salvo.idioma !== undefined && !ehIdioma(salvo.idioma)) {
    throw new Error('Invalid language in the saved fictional demo state. Restore the file or reset it explicitly.');
  }
  definirIdioma(salvo.idioma ?? 'en-US');
  estado.versao = salvo.versao;
  estado.pacientes = salvo.pacientes;
  estado.pendencias = salvo.pendencias;
  estado.auditoria = salvo.auditoria;
  estado.propostas.clear();
  for (const [key, proposal] of salvo.propostas ?? []) estado.propostas.set(key, proposal);
}
/** A fresh fictional database, used only when the durable store has no snapshot yet. */
export function estadoInicial(): EstadoSalvo {
  return { ...criarSeed(), versao: 2, idioma: idiomaAtual(), auditoria: [], propostas: [] };
}
export function marcarAlteracao(): void { mudou(); }

/** Recria o seed no idioma atual da demo. */
export function resetar(): void {
  const seed = criarSeed();
  estado.pacientes = seed.pacientes;
  estado.pendencias = seed.pendencias;
  estado.propostas.clear();
  estado.auditoria = [];
  estado.versao += 1;
  for (const callback of aoResetar) callback();
}

resetar();

/** Troca o idioma da demo e recria os dados fictícios nesse idioma. */
export function trocarIdiomaDemo(idioma: Idioma): void {
  definirIdioma(idioma);
  resetar();
}

export function versaoAtual(): number {
  return estado.versao;
}

function mudou(): void {
  estado.versao += 1;
}

export function todosPacientes(): Paciente[] {
  return estado.pacientes;
}

export function todasPendencias(): Pendencia[] {
  return estado.pendencias;
}

export function obterPaciente(id: string): Paciente {
  const paciente = estado.pacientes.find((p) => p.id === id);
  if (!paciente) throw new ErroDominio(404, 'paciente_nao_encontrado', tr('Paciente não encontrado.', 'Patient not found.'));
  return paciente;
}

export function pacienteDaSessao(token: string | undefined): Paciente {
  const id = token ? SESSOES_PACIENTE[token] : undefined;
  if (!id) throw new ErroDominio(401, 'sessao_invalida', tr('Sessão do paciente inválida.', 'Invalid patient session.'));
  return obterPaciente(id);
}

export function usuarioPorId(id: string | undefined): UsuarioEquipe {
  const usuario = USUARIOS_EQUIPE.find((u) => u.id === id);
  if (!usuario) throw new ErroDominio(401, 'usuario_invalido', tr('Usuário da equipe não identificado.', 'Team user not identified.'));
  return usuario;
}

export function auditar(ator: string, acao: string, alvo: string): void {
  estado.auditoria.push({ em: agoraISO(), ator, acao, alvo });
}

// ---------------------------------------------------------------------------
// Conversa
// ---------------------------------------------------------------------------

export function adicionarMensagem(
  paciente: Paciente,
  parcial: Omit<Mensagem, 'id' | 'em' | 'horario'>
): Mensagem {
  const em = agoraISO();
  const mensagem: Mensagem = { id: gerarId('msg'), em, horario: horarioDe(em), ...parcial };
  paciente.mensagens.push(mensagem);
  paciente.ultimaInteracao = tr(`Hoje, ${mensagem.horario}`, `Today, ${mensagem.horario}`);
  mudou();
  return mensagem;
}

function marcadorEquipe(paciente: Paciente, texto: string, tipoSistema: Mensagem['tipoSistema']): void {
  adicionarMensagem(paciente, {
    autor: 'sistema',
    nomeAutor: tr('Sistema', 'System'),
    texto,
    sistema: true,
    tipoSistema,
    visivelPaciente: false,
  });
}

function marcadorParaTodos(paciente: Paciente, texto: string): void {
  adicionarMensagem(paciente, {
    autor: 'sistema',
    nomeAutor: tr('Sistema', 'System'),
    texto,
    sistema: true,
    tipoSistema: 'info',
    visivelPaciente: true,
  });
}

export function assumirConversa(pacienteId: string, usuario: UsuarioEquipe): void {
  const paciente = obterPaciente(pacienteId);
  if (paciente.modoConversa === 'profissional' && paciente.profissionalResponsavel === usuario.nome) {
    paciente.ultimaAtividadeProfissional = agoraISO();
    return;
  }
  paciente.modoConversa = 'profissional';
  paciente.profissionalResponsavel = usuario.nome;
  paciente.ultimaAtividadeProfissional = agoraISO();
  estado.propostas.delete(pacienteId);
  marcadorParaTodos(paciente, tr(`${usuario.nome} entrou na conversa`, `${usuario.nome} joined the conversation`));
  auditar(usuario.nome, 'assumiu_conversa', pacienteId);
}

export function devolverParaLia(
  pacienteId: string,
  usuario: UsuarioEquipe | undefined,
  motivo: 'manual' | 'inatividade'
): void {
  const paciente = obterPaciente(pacienteId);
  if (paciente.modoConversa === 'lia') return;
  paciente.modoConversa = 'lia';
  paciente.profissionalResponsavel = undefined;
  paciente.ultimaAtividadeProfissional = undefined;
  marcadorParaTodos(
    paciente,
    motivo === 'inatividade'
      ? tr(`A ${CONFIG_SERVICO.assistenteNome} voltou a atender após um período sem atividade da equipe`, `${CONFIG_SERVICO.assistenteNome} took the conversation back after a period without team activity`)
      : tr(`${usuario?.nome ?? 'A equipe'} devolveu o atendimento para a ${CONFIG_SERVICO.assistenteNome}`, `${usuario?.nome ?? 'The team'} handed the conversation back to ${CONFIG_SERVICO.assistenteNome}`)
  );
  auditar(usuario?.nome ?? 'sistema', `devolveu_conversa_${motivo}`, pacienteId);
}

export function mensagemDoProfissional(pacienteId: string, usuario: UsuarioEquipe, texto: string): void {
  // Validate before assuming the conversation or appending its team-joined marker.
  // The native strict contract accepts at most 4,000 characters per message.
  if (texto.length > 4000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(texto)) {
    throw new ErroDominio(400, 'mensagem_invalida', tr('Use uma mensagem com até 4.000 caracteres e sem caracteres de controle inválidos.', 'Use a message with up to 4,000 characters and no invalid control characters.'));
  }
  const limpo = texto.trim();
  if (!limpo) throw new ErroDominio(400, 'texto_vazio', tr('Digite uma mensagem.', 'Type a message.'));
  // Como no IRIS: enviar uma mensagem com a Lia ativa faz o profissional assumir a conversa.
  assumirConversa(pacienteId, usuario);
  const paciente = obterPaciente(pacienteId);
  paciente.ultimaAtividadeProfissional = agoraISO();
  adicionarMensagem(paciente, {
    autor: 'profissional',
    nomeAutor: usuario.nome,
    texto: limpo,
    visivelPaciente: true,
  });
  auditar(usuario.nome, 'enviou_mensagem', pacienteId);
}

export function iniciarVideochamada(pacienteId: string, usuario: UsuarioEquipe): string {
  const paciente = obterPaciente(pacienteId);
  const sala = gerarSalaVideochamada(paciente.id);
  assumirConversa(pacienteId, usuario);
  adicionarMensagem(paciente, {
    autor: 'sistema',
    nomeAutor: tr('Sistema', 'System'),
    texto: tr(`Videochamada aberta por ${usuario.nome}`, `Video call opened by ${usuario.nome}`),
    sistema: true,
    tipoSistema: 'videochamada',
    link: sala,
    visivelPaciente: true,
  });
  auditar(usuario.nome, 'abriu_videochamada', pacienteId);
  return sala;
}

// Herdado do IRIS: sem atividade do profissional por N minutos, a Lia volta a atender.
export function verificarInatividade(): void {
  const limite = CONFIG_SERVICO.minutosRetornoLia * 60_000;
  const agora = Date.now();
  for (const paciente of estado.pacientes) {
    if (paciente.modoConversa !== 'profissional' || !paciente.ultimaAtividadeProfissional) continue;
    if (agora - new Date(paciente.ultimaAtividadeProfissional).getTime() >= limite) {
      devolverParaLia(paciente.id, undefined, 'inatividade');
    }
  }
}

export function atualizarPlano(pacienteId: string, usuario: UsuarioEquipe, texto: string, atualizadoEm: string): void {
  const paciente = obterPaciente(pacienteId);
  if (!texto.trim()) throw new ErroDominio(400, 'plano_vazio', tr('O arquivo do plano está vazio.', 'The plan file is empty.'));
  paciente.planoTerapeuticoTexto = texto.trim();
  paciente.planoAtualizadoEm = atualizadoEm;
  auditar(usuario.nome, 'atualizou_plano', pacienteId);
  mudou();
}

// ---------------------------------------------------------------------------
// Pendências
// ---------------------------------------------------------------------------

export function criarPendencia(
  paciente: Paciente,
  dados: Omit<Pendencia, 'id' | 'pacienteId' | 'estado' | 'criadaEm' | 'prazo' | 'papelDestino'> & {
    papelDestino?: Pendencia['papelDestino'];
    prazoHoras?: number;
  }
): Pendencia {
  const criadaEm = agoraISO();
  const { prazoHoras, papelDestino, ...resto } = dados;
  const pendencia: Pendencia = {
    id: gerarId('pend'),
    pacienteId: paciente.id,
    estado: 'aberta',
    criadaEm,
    papelDestino: papelDestino ?? CONFIG_SERVICO.papelPorTipo[dados.tipo],
    prazo: somarHoras(criadaEm, prazoHoras ?? CONFIG_SERVICO.prazoHorasPorTipo[dados.tipo]),
    ...resto,
  };
  estado.pendencias.push(pendencia);
  mudou();
  return pendencia;
}

export function obterPendencia(id: string): Pendencia {
  const pendencia = estado.pendencias.find((p) => p.id === id);
  if (!pendencia) throw new ErroDominio(404, 'pendencia_nao_encontrada', tr('Pendência não encontrada.', 'Pending item not found.'));
  return pendencia;
}

export function assumirPendencia(id: string, usuario: UsuarioEquipe): void {
  const pendencia = obterPendencia(id);
  if (pendencia.estado === 'concluida') {
    throw new ErroDominio(409, 'pendencia_concluida', tr('Esta pendência já foi concluída.', 'This pending item is already closed.'));
  }
  if ((pendencia.responsavelId && pendencia.responsavelId !== usuario.id) || (!pendencia.responsavelId && pendencia.responsavel && pendencia.responsavel !== usuario.nome)) {
    throw new ErroDominio(409, 'responsavel_diferente', tr('Esta pendência tem outro responsável. Registre uma transferência antes de assumir.', 'This item has another assignee. Record a transfer before taking it on.'));
  }
  if (pendencia.estado === 'em_andamento' && (pendencia.responsavelId === usuario.id || pendencia.responsavel === usuario.nome)) return;
  pendencia.estado = 'em_andamento';
  pendencia.responsavel = usuario.nome;
  pendencia.responsavelId = usuario.id;
  pendencia.assumidaEm ??= agoraISO();
  registrarEventoPendencia(pendencia, usuario, { acao: 'assumida' });
  auditar(usuario.nome, 'assumiu_pendencia', id);
  mudou();
}

export function concluirPendencia(id: string, usuario: UsuarioEquipe, desfecho: Desfecho): void {
  const pendencia = obterPendencia(id);
  if (pendencia.estado === 'concluida') {
    throw new ErroDominio(409, 'pendencia_concluida', tr('Esta pendência já foi concluída.', 'This pending item is already closed.'));
  }
  if ((pendencia.responsavelId && pendencia.responsavelId !== usuario.id) || (!pendencia.responsavelId && pendencia.responsavel && pendencia.responsavel !== usuario.nome)) {
    throw new ErroDominio(409, 'responsavel_diferente', tr('Registre a transferência de responsabilidade antes de concluir.', 'Record an assignment transfer before completing this item.'));
  }
  pendencia.estado = 'concluida';
  pendencia.responsavel = pendencia.responsavel ?? usuario.nome;
  pendencia.responsavelId ??= usuario.id;
  pendencia.desfecho = desfecho;
  pendencia.concluidaEm = agoraISO();
  pendencia.concluidaPor = usuario.nome;
  registrarEventoPendencia(pendencia, usuario, { acao: 'concluida', para: desfecho });
  auditar(usuario.nome, `concluiu_pendencia_${desfecho}`, id);
  mudou();
}

function registrarEventoPendencia(pendencia: Pendencia, usuario: UsuarioEquipe, evento: Pick<EventoPendencia, 'acao' | 'motivo' | 'de' | 'para'>): void {
  pendencia.historico ??= [];
  pendencia.historico.push({ id: gerarId('evento'), em: agoraISO(), atorId: usuario.id, atorNome: usuario.nome, ...evento });
  pendencia.revisao = (pendencia.revisao ?? 0) + 1;
}

export function gerenciarPendencia(id: string, usuario: UsuarioEquipe, input: GestaoPendenciaInput): void {
  const p = obterPendencia(id);
  if (p.estado === 'concluida') throw new ErroDominio(409, 'pendencia_concluida', tr('Pendência concluída não pode ser alterada.', 'Closed items cannot be changed.'));
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !['revisao', 'motivo', 'responsavelId', 'prazo'].includes(k))) {
    throw new ErroDominio(400, 'gestao_invalida', tr('Alteração inválida.', 'Invalid change.'));
  }
  if (!Number.isInteger(input.revisao) || input.revisao !== (p.revisao ?? 0)) {
    throw new ErroDominio(409, 'revisao_desatualizada', tr('Outro profissional alterou esta pendência. Atualize antes de salvar.', 'Another professional changed this item. Refresh before saving.'));
  }
  if (typeof input.motivo !== 'string' || input.motivo.trim().length < 8 || input.motivo.length > 500 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(input.motivo)) {
    throw new ErroDominio(400, 'motivo_invalido', tr('Informe uma justificativa de 8 a 500 caracteres.', 'Enter a reason with 8 to 500 characters.'));
  }
  const destino = input.responsavelId === undefined ? undefined : USUARIOS_EQUIPE.find(u => u.id === input.responsavelId);
  if (input.responsavelId !== undefined && !destino) throw new ErroDominio(400, 'responsavel_invalido', tr('Selecione um profissional da equipe.', 'Select a care team professional.'));
  if (input.prazo !== undefined && (typeof input.prazo !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input.prazo) || !Number.isFinite(Date.parse(input.prazo)) || new Date(input.prazo).toISOString() !== input.prazo || Date.parse(input.prazo) <= Date.now())) {
    throw new ErroDominio(400, 'prazo_invalido', tr('O novo prazo precisa ser uma data futura válida.', 'The new deadline must be a valid future date.'));
  }
  const motivo = input.motivo.trim();
  const alterarResponsavel = destino && destino.id !== p.responsavelId;
  const alterarPrazo = input.prazo !== undefined && input.prazo !== p.prazo;
  if (!alterarResponsavel && !alterarPrazo) throw new ErroDominio(400, 'sem_alteracao', tr('Nenhuma alteração foi informada.', 'No change was provided.'));
  // Todas as validações vêm antes de alterar o domínio.
  if (alterarResponsavel) {
    registrarEventoPendencia(p, usuario, { acao: 'atribuida', motivo, de: p.responsavel, para: destino.nome });
    p.responsavel = destino.nome; p.responsavelId = destino.id; p.papelDestino = destino.papel;
  }
  if (alterarPrazo) {
    registrarEventoPendencia(p, usuario, { acao: 'prazo_alterado', motivo, de: p.prazo, para: input.prazo });
    p.prazo = input.prazo!;
  }
  auditar(usuario.nome, 'gerenciou_pendencia', id);
  mudou();
}

export function situacaoDe(pacienteId: string): SituacaoPaciente {
  const abertas = estado.pendencias.filter((p) => p.pacienteId === pacienteId && p.estado !== 'concluida');
  if (abertas.some((p) => p.tipo === 'sinal_urgencia')) return 'sinal_a_revisar';
  if (abertas.length > 0) return 'aguardando_revisao';
  return 'sem_pendencias';
}

// Possível urgência: o paciente vê o aviso aprovado pelo hospital; a equipe recebe uma hipótese
// do sistema para revisar, com a fala literal ao lado. Nada disso é classificação clínica.
export function registrarSinalUrgencia(paciente: Paciente, falaLiteral: string, termo: string): Pendencia {
  const aviso = CONFIG_SERVICO.avisoUrgencia;
  adicionarMensagem(paciente, {
    autor: 'lia',
    nomeAutor: CONFIG_SERVICO.assistenteNome,
    texto: `${aviso.titulo}. ${aviso.texto}`,
    sistema: true,
    tipoSistema: 'urgencia',
    visivelPaciente: true,
  });
  const pendencia = criarPendencia(paciente, {
    tipo: 'sinal_urgencia',
    origem: 'hipotese_sistema',
    titulo: tr('Possível sinal de urgência mencionado', 'Possible urgency sign mentioned'),
    falaLiteral,
    motivo: tr(`Termo da lista do serviço: "${termo}"`, `Term from the service list: "${termo}"`),
  });
  marcadorEquipe(
    paciente,
    tr(`Possível sinal de urgência mencionado ("${termo}") · hipótese do sistema, aguardando revisão`, `Possible urgency sign mentioned ("${termo}") · system hypothesis, awaiting review`),
    'hipotese'
  );
  return pendencia;
}

// ---------------------------------------------------------------------------
// Check-in
// ---------------------------------------------------------------------------

function regraQueDispara(paciente: Paciente): RegraRevisaoCheckin | undefined {
  const ordenados = [...paciente.checkins].sort((a, b) => a.em.localeCompare(b.em));
  return CONFIG_SERVICO.regrasRevisao.find((regra) => {
    const ultimos = ordenados.slice(-regra.emSeguida);
    if (ultimos.length < regra.emSeguida) return false;
    return ultimos.every((c) => c.opcoes.some((o) => regra.seAlgumaOpcao.includes(o)));
  });
}

export function registrarCheckin(
  paciente: Paciente,
  opcoes: OpcaoCheckin[],
  texto: string | undefined,
  origem: Checkin['origem']
): { checkin: Checkin; urgencia: boolean } {
  if (opcoes.length === 0 && !texto?.trim()) {
    throw new ErroDominio(400, 'checkin_vazio', tr('Escolha uma opção ou conte como você está.', 'Pick an option or tell us how you are.'));
  }
  const checkin: Checkin = {
    id: gerarId('ck'),
    em: agoraISO(),
    opcoes,
    texto: texto?.trim() || undefined,
    origem,
  };
  paciente.checkins.push(checkin);
  mudou();
  auditar(paciente.nome, 'registrou_checkin', paciente.id);

  const regra = regraQueDispara(paciente);
  if (regra) {
    criarPendencia(paciente, {
      tipo: 'checkin',
      origem: 'regra_servico',
      titulo: tr('Check-in aguardando revisão', 'Check-in awaiting review'),
      falaLiteral: checkin.texto,
      motivo: regra.exemplo ? tr(`${regra.descricao} (critério ilustrativo — a definir com o serviço)`, `${regra.descricao} (illustrative criterion, to be defined with the service)`) : regra.descricao,
      papelDestino: regra.papelDestino,
      prazoHoras: regra.prazoHoras,
    });
    marcadorEquipe(paciente, tr(`Check-in registrado · aguardando revisão (${regra.descricao})`, `Check-in logged · awaiting review (${regra.descricao})`), 'info');
  }

  const urgencia = checkin.texto ? detectarUrgencia(checkin.texto) : undefined;
  if (urgencia) registrarSinalUrgencia(paciente, checkin.texto!, urgencia.termo);

  return { checkin, urgencia: Boolean(urgencia) };
}

// ---------------------------------------------------------------------------
// Propostas da Lia (confirmação em duas fases)
// ---------------------------------------------------------------------------

export function definirProposta(
  paciente: Paciente,
  proposta: Omit<PropostaInterna, 'token' | 'pacienteId' | 'expiraEm'>
): PropostaInterna {
  const completa: PropostaInterna = {
    ...proposta,
    token: gerarId('conf'),
    pacienteId: paciente.id,
    expiraEm: new Date(Date.now() + CONFIG_SERVICO.minutosValidadeConfirmacao * 60_000).toISOString(),
  };
  estado.propostas.set(paciente.id, completa);
  mudou();
  return completa;
}

export function propostaDe(pacienteId: string): PropostaInterna | undefined {
  return estado.propostas.get(pacienteId);
}

export function limparProposta(pacienteId: string): void {
  if (estado.propostas.delete(pacienteId)) mudou();
}

export function pendenciasPorTipo(pacienteId: string, tipo: TipoPendencia): Pendencia[] {
  return estado.pendencias.filter((p) => p.pacienteId === pacienteId && p.tipo === tipo);
}
