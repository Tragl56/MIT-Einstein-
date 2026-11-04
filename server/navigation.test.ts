import assert from 'node:assert/strict';
import { test } from 'node:test';
import { criarApi } from './api';
import { criarPendencia, obterPaciente, obterPendencia, resetar, exportarEstado, importarEstado } from './estado';
import { csvFila, filtrarFila, indicadoresFila, itensFila } from '../src/domain/fila';
import { visaoPro } from './visoes';

test('navigation management validates identity, atomic changes, stale versions and private history', async t => {
  resetar();
  const p = criarPendencia(obterPaciente('pac-maria'), { tipo: 'contato_equipe', origem: 'solicitacao_paciente', titulo: 'Organizar retorno fictício', confirmadaPeloPaciente: true });
  const api = criarApi({ statePath: null });
  const server = api.app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(async () => { api.dispose(); await new Promise<void>(resolve => server.close(() => resolve())); });
  const a = server.address(); assert.ok(a && typeof a !== 'string');
  const origin = `http://127.0.0.1:${a.port}`;
  const endpoint = `/api/pro/pendencias/${p.id}`;
  async function post(suffix: string, body: unknown, user?: string) {
    const response = await fetch(origin + endpoint + suffix, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(user ? { 'x-demo-usuario': user } : {}) }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }
  const reason = 'Organização interna fictícia da cobertura';
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const input = { revisao: 0, responsavelId: 'usr-carla', prazo: future, motivo: reason };
  assert.equal((await post('/gestao', input)).status, 401);
  assert.equal((await post('/gestao', { ...input, prazo: '2030-02-30T12:00:00.000Z' }, 'usr-rodrigo')).status, 400);
  assert.equal(obterPendencia(p.id).responsavelId, undefined, 'invalid deadline must not partially assign');
  assert.equal((await post('/gestao', { ...input, responsavelId: 'outside-team' }, 'usr-rodrigo')).status, 400);
  assert.equal((await post('/gestao', { ...input, motivo: 'curto' }, 'usr-rodrigo')).status, 400);
  assert.equal((await post('/gestao', input, 'usr-rodrigo')).status, 200);
  assert.equal(p.responsavelId, 'usr-carla'); assert.equal(p.prazo, future); assert.equal(p.estado, 'aberta');
  assert.deepEqual(p.historico?.map(e => e.acao), ['atribuida', 'prazo_alterado']);
  assert.equal(p.historico?.[0].atorId, 'usr-rodrigo');
  assert.equal((await post('/gestao', { ...input, responsavelId: 'usr-camila' }, 'usr-rodrigo')).status, 409);
  assert.equal(p.responsavelId, 'usr-carla', 'stale writer cannot replace a newer assignment');
  assert.equal((await post('/assumir', {}, 'usr-camila')).status, 409);
  assert.equal((await post('/assumir', {}, 'usr-carla')).status, 200);
  const events = p.historico!.length;
  assert.equal((await post('/assumir', {}, 'usr-carla')).status, 200);
  assert.equal(p.historico!.length, events, 'repeated take-on is idempotent');
  assert.equal((await post('/concluir', { desfecho: 'contato_realizado' }, 'usr-camila')).status, 409);
  assert.equal((await post('/concluir', { desfecho: 'contato_realizado' }, 'usr-carla')).status, 200);
  assert.equal((await post('/gestao', { ...input, revisao: p.revisao }, 'usr-carla')).status, 409);
  const patient = await fetch(origin + '/api/paciente/inicio', { headers: { Authorization: 'Bearer demo-maria' } });
  const patientText = await patient.text(); assert.equal(patient.status, 200); assert.equal(patientText.includes(reason), false);
  const saved = structuredClone(exportarEstado()); importarEstado(saved);
  assert.equal(obterPendencia(p.id).historico?.length, events + 1, 'history survives snapshot rehydration');
});

test('queue filters and operational metrics use dates, IDs and measured samples', () => {
  resetar();
  const estado = visaoPro(); const actor = estado.usuarios[0];
  const base = estado.pacientes[0]; const now = Date.parse('2030-01-08T12:00:00Z');
  const common = { pacienteId: base.id, tipo: 'contato_equipe' as const, origem: 'solicitacao_paciente' as const, titulo: 'Retorno', papelDestino: 'medico' as const, criadaEm: '2030-01-08T08:00:00Z' };
  const patient = { ...base, pendencias: [
    { ...common, id: 'a', estado: 'aberta' as const, prazo: '2030-01-08T10:00:00Z' },
    { ...common, id: 'b', estado: 'em_andamento' as const, prazo: '2030-01-09T12:00:00Z', responsavelId: actor.id, responsavel: 'Renamed user', assumidaEm: '2030-01-08T10:00:00Z' },
    { ...common, id: 'c', estado: 'concluida' as const, prazo: '2030-01-08T09:00:00Z', concluidaEm: '2030-01-08T12:00:00Z' },
  ] };
  const items = itensFila([patient]);
  const metrics = indicadoresFila(items, now);
  assert.equal(metrics.abertas, 2); assert.equal(metrics.vencidas, 1); assert.equal(metrics.semResponsavel, 1); assert.equal(metrics.concluidas7dias, 1);
  assert.equal(metrics.primeiraAcaoHoras, 3); assert.equal(metrics.amostraTempo, 2);
  const filters = { busca: '', estado: 'abertas' as const, responsavel: 'minhas' as const, vencidas: false, somenteSinais: false };
  assert.deepEqual(filtrarFila(items, filters, actor, now).map(i => i.pendencia.id), ['b']);
  assert.deepEqual(filtrarFila(items, { ...filters, responsavel: 'todos', vencidas: true }, actor, now).map(i => i.pendencia.id), ['a']);
  assert.equal(filtrarFila(items, { ...filters, busca: 'unmatched' }, actor, now).length, 0);
  assert.equal(indicadoresFila([], now).primeiraAcaoHoras, null);
});

test('CSV neutralizes spreadsheet formulas, quotes and multi-line patient names', () => {
  resetar(); const patient = visaoPro().pacientes[0];
  const p = { ...patient, nome: '=HYPERLINK("https://example.org")\nFake' };
  const item = { paciente: p, pendencia: { ...visaoPro().pacientes.flatMap(p => p.pendencias)[0], responsavel: ' +CMD' } };
  const csv = csvFila([item]);
  assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes('"\'=HYPERLINK(""https://example.org"")\nFake"'));
  assert.ok(csv.includes('"\' +CMD"'));
  assert.equal(csv.includes('diagnosticoResumido'), false);
});
