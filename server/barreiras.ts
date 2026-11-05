import type { AtualizarBarreiraInput, BarreiraAcesso, CriarBarreiraInput, EstadoBarreira, UsuarioEquipe } from '../src/types';
import { auditar, ErroDominio, marcarAlteracao, obterPaciente, usuarioPorId } from './estado';
import { agoraISO, gerarId } from './util';
import { tr } from '../src/idioma';

const transicoes: Record<EstadoBarreira, EstadoBarreira[]> = {
  aberta: ['aberta', 'em_acompanhamento', 'resolvida', 'encerrada_sem_resolucao'],
  em_acompanhamento: ['em_acompanhamento', 'resolvida', 'encerrada_sem_resolucao'],
  resolvida: [], encerrada_sem_resolucao: [],
};
function invalido(): never { throw new ErroDominio(400, 'barreira_invalida', tr('Confira categoria, profissional, prazo futuro e descrição de 8 a 500 caracteres.', 'Check the category, assignee, future deadline and 8–500 character description.')); }
function objeto(input: unknown, keys: string[]): asserts input is Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !keys.includes(k)) || keys.some(k => !(k in input))) invalido();
}
function texto(input: unknown): input is string { return typeof input === 'string' && input.trim().length >= 8 && input.length <= 500 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(input); }
function prazoValido(input: unknown): input is string { return typeof input === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input) && Number.isFinite(Date.parse(input)) && new Date(input).toISOString() === input; }
function responsavel(input: unknown) { if (typeof input !== 'string') invalido(); try { usuarioPorId(input); } catch { invalido(); } }
function resumo(b: BarreiraAcesso) { return { estado: b.estado, responsavelId: b.responsavelId, prazo: b.prazo }; }

export function criarBarreira(pacienteId: string, ator: UsuarioEquipe, input: CriarBarreiraInput): BarreiraAcesso {
  const p = obterPaciente(pacienteId);
  objeto(input, ['chave', 'categoria', 'descricao', 'responsavelId', 'prazo']);
  if (typeof input.chave !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(input.chave) || !['transporte', 'agendamento', 'apoio_social', 'comunicacao', 'outra'].includes(input.categoria) || !texto(input.descricao) || !prazoValido(input.prazo)) invalido();
  responsavel(input.responsavelId);
  const existente = p.barreiras?.find(b => b.chave === input.chave);
  if (existente) {
    if (Object.keys(input).some(k => input[k as keyof CriarBarreiraInput] !== existente.criacao[k as keyof CriarBarreiraInput])) throw new ErroDominio(409, 'chave_reutilizada', tr('Este envio já foi usado com outros dados.', 'This submission was already used with different data.'));
    return existente;
  }
  if (Date.parse(input.prazo) <= Date.now()) invalido();
  const b: BarreiraAcesso = { ...input, criacao: { ...input }, descricao: input.descricao.trim(), id: gerarId('barreira'), criadaEm: agoraISO(), criadaPor: ator.id, estado: 'aberta', revisao: 0, historico: [] };
  b.historico.push({ em: b.criadaEm, atorId: ator.id, atorNome: ator.nome, motivo: tr('Registro manual pela equipe.', 'Manually recorded by the team.'), novo: resumo(b) });
  (p.barreiras ??= []).push(b); auditar(ator.nome, 'registrou_barreira', b.id); marcarAlteracao(); return b;
}

export function atualizarBarreira(pacienteId: string, id: string, ator: UsuarioEquipe, input: AtualizarBarreiraInput): BarreiraAcesso {
  const b = obterPaciente(pacienteId).barreiras?.find(b => b.id === id);
  if (!b) throw new ErroDominio(404, 'barreira_nao_encontrada', tr('Barreira não encontrada neste paciente.', 'Barrier not found for this patient.'));
  objeto(input, ['revisao', 'estado', 'responsavelId', 'prazo', 'motivo']);
  if (!Number.isInteger(input.revisao) || input.revisao !== b.revisao) throw new ErroDominio(409, 'revisao_desatualizada', tr('Este registro foi alterado. Feche e abra a edição para atualizar.', 'This record changed. Close and reopen the editor to refresh.'));
  if (!texto(input.motivo) || !prazoValido(input.prazo) || !Object.hasOwn(transicoes, input.estado)) invalido();
  if (!transicoes[b.estado].includes(input.estado)) throw new ErroDominio(409, 'transicao_invalida', tr('Esta transição não é permitida. Registros encerrados preservam o desfecho.', 'This transition is not allowed. Closed records preserve their outcome.'));
  responsavel(input.responsavelId);
  if (input.prazo !== b.prazo && Date.parse(input.prazo) <= Date.now()) invalido();
  const encerrando = input.estado === 'resolvida' || input.estado === 'encerrada_sem_resolucao';
  if (encerrando && (b.responsavelId !== ator.id || input.responsavelId !== ator.id)) throw new ErroDominio(409, 'responsavel_diferente', tr('Transfira a responsabilidade antes de encerrar. Somente o responsável pode registrar o desfecho.', 'Transfer ownership before closing. Only the assignee can record the outcome.'));
  const anterior = resumo(b);
  b.estado = input.estado; b.responsavelId = input.responsavelId; b.prazo = input.prazo; b.revisao++;
  b.historico.push({ em: agoraISO(), atorId: ator.id, atorNome: ator.nome, motivo: input.motivo.trim(), anterior, novo: resumo(b) });
  auditar(ator.nome, `atualizou_barreira_${b.estado}`, b.id); marcarAlteracao(); return b;
}
