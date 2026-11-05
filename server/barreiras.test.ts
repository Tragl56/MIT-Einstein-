import assert from 'node:assert/strict';
import { test } from 'node:test';
import { criarApi } from './api';
import { exportarEstado, importarEstado, obterPaciente, resetar } from './estado';

test('access barriers validate, retry safely, reject stale edits, preserve history and stay private', async t => {
  resetar(); const api = criarApi({ statePath: null, autoConnect: true });
  const server = api.app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(async () => { api.dispose(); await new Promise<void>(resolve => server.close(() => resolve())); });
  const a = server.address(); assert.ok(a && typeof a !== 'string'); const origin = `http://127.0.0.1:${a.port}`;
  const path = '/api/pro/pacientes/pac-maria/barreiras';
  async function post(url: string, body: unknown, user?: string) {
    const res = await fetch(origin + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(user ? { 'x-demo-usuario': user } : {}) }, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  }
  const input = { chave: 'barreira-idempotencia-123', categoria: 'transporte', descricao: 'Nota interna fictícia: dificuldade de transporte para retorno.', responsavelId: 'usr-carla', prazo: new Date(Date.now() + 86_400_000).toISOString() };
  assert.equal((await post(path, input)).status, 401);
  for (const patch of [{ categoria: 'diagnostico' }, { descricao: 'curta' }, { responsavelId: 'outside' }, { prazo: '2030-02-30T12:00:00.000Z' }, { prazo: new Date(0).toISOString() }, { estado: 'resolvida' }]) assert.equal((await post(path, { ...input, ...patch }, 'usr-carla')).status, 400);
  assert.equal(obterPaciente('pac-maria').barreiras, undefined);
  const created = await post(path, input, 'usr-carla'); assert.equal(created.status, 200);
  assert.equal((await post(path, input, 'usr-carla')).body.id, created.body.id);
  assert.equal(obterPaciente('pac-maria').barreiras?.length, 1);
  assert.equal((await post(path, { ...input, descricao: 'Outro registro fictício com mesma chave' }, 'usr-carla')).status, 409);
  const url = `${path}/${created.body.id}`;
  const update = { revisao: 0, estado: 'em_acompanhamento', responsavelId: 'usr-carla', prazo: input.prazo, motivo: 'Equipe consultou opções fictícias de transporte.' };
  assert.equal((await post(url, { ...update, prazo: new Date(0).toISOString(), responsavelId: 'usr-rodrigo' }, 'usr-carla')).status, 400);
  assert.equal(obterPaciente('pac-maria').barreiras?.[0].responsavelId, 'usr-carla');
  assert.equal((await post(url.replace('pac-maria', 'pac-jose'), update, 'usr-carla')).status, 404);
  assert.equal((await post(url, update, 'usr-carla')).status, 200);
  assert.equal((await post(url, update, 'usr-carla')).status, 409);
  assert.equal((await post(url, { ...update, revisao: 1, estado: 'resolvida' }, 'usr-rodrigo')).status, 409);
  assert.equal((await post(url, { ...update, revisao: 1, estado: 'encerrada_sem_resolucao', motivo: 'Não houve transporte disponível na simulação; retorno da equipe registrado.' }, 'usr-carla')).status, 200);
  assert.equal((await post(url, { ...update, revisao: 2 }, 'usr-carla')).status, 409);
  const snapshot = structuredClone(exportarEstado()); importarEstado(snapshot);
  const b = obterPaciente('pac-maria').barreiras![0];
  assert.equal(b.estado, 'encerrada_sem_resolucao'); assert.equal(b.historico.length, 3); assert.equal(b.historico[1].anterior?.estado, 'aberta'); assert.equal(b.historico[2].atorId, 'usr-carla');
  assert.ok(snapshot.auditoria.some(e => e.alvo === b.id));
  const pro = await fetch(origin + '/api/pro/estado', { headers: { 'x-demo-usuario': 'usr-carla' } });
  assert.ok((await pro.text()).includes(input.descricao));
  const patient = await fetch(origin + '/api/paciente/inicio', { headers: { Authorization: 'Bearer demo-maria' } });
  const patientText = await patient.text(); assert.equal(patient.status, 200); assert.equal(patientText.includes(input.descricao), false); assert.equal(patientText.includes('barreiras'), false);
  const login = await post('/api/mobile/demo-session', { patientId: 'pac-maria' });
  for (const resource of ['summary', 'requests', 'journey', 'documents', 'appointments']) {
    const response = await fetch(origin + `/api/v1/tenants/demo/hospitals/oncoflow/patients/pac-maria/${resource}`, { headers: { Authorization: `Bearer ${login.body.accessToken}` } });
    assert.equal(response.status, 200); const text = await response.text(); assert.equal(text.includes(input.descricao), false); assert.equal(text.includes('barreiras'), false);
  }
});
