import assert from 'node:assert/strict';
import { test } from 'node:test';
import { criarApi } from './api';
import { obterPaciente, resetar } from './estado';

test('Llama relay binds turns to session, leases jobs, preserves snapshots and excludes private notes', async t => {
  const previous = process.env.ONCOFLOW_LIA_WORKER_TOKEN; process.env.ONCOFLOW_LIA_WORKER_TOKEN = 'fictional-test-worker-token-1234567890';
  resetar(); obterPaciente('pac-maria').planoTerapeuticoTexto = 'PRIVATE_PLAN_MUST_NOT_LEAVE';
  const api = criarApi({ statePath: null, autoConnect: true }); const server = api.app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(async () => { if (previous) process.env.ONCOFLOW_LIA_WORKER_TOKEN = previous; else delete process.env.ONCOFLOW_LIA_WORKER_TOKEN; api.dispose(); await new Promise<void>(resolve => server.close(() => resolve())); });
  const a = server.address(); assert.ok(a && typeof a !== 'string'); const origin = `http://127.0.0.1:${a.port}`;
  async function request(path: string, body?: unknown, headers: Record<string, string> = {}) {
    const r = await fetch(origin + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); return { status: r.status, body: await r.json() };
  }
  const login = await request('/api/mobile/demo-session', { patientId: 'pac-maria' }); const auth = { Authorization: `Bearer ${login.body.accessToken}` };
  const prefix = '/api/v1/tenants/demo/hospitals/oncoflow/patients/pac-maria/lia';
  assert.equal((await request(prefix, { text: 'minha agenda', locale: 'pt-BR' }, auth)).status, 503);
  assert.equal((await request('/api/mobile/lia-worker/claim', {})).status, 401);
  const worker = { 'x-oncoflow-worker': process.env.ONCOFLOW_LIA_WORKER_TOKEN! };
  assert.equal((await request('/api/mobile/lia-worker/claim', {}, worker)).status, 200);
  assert.equal((await request(prefix, { text: 'minha agenda', locale: 'pt-BR' })).status, 401);
  const turn = await request(prefix, { text: 'minha agenda', locale: 'pt-BR' }, auth); assert.equal(turn.status, 200);
  const id = turn.body.data.id;
  const other = await request('/api/mobile/demo-session', { patientId: 'pac-maria' });
  assert.equal((await request(`${prefix}/${id}`, undefined, { Authorization: `Bearer ${other.body.accessToken}` })).status, 404);
  const { job } = (await request('/api/mobile/lia-worker/claim', {}, worker)).body;
  assert.equal(job.id, id); assert.equal(job.context.includes('PRIVATE_PLAN_MUST_NOT_LEAVE'), false);
  assert.equal((await request('/api/mobile/lia-worker/claim', {}, worker)).body.job, null);
  assert.equal((await request('/api/mobile/lia-worker/result', { id, lease: 'invalid', result: { action: null } }, worker)).status, 409);
  const action = { type: 'read', target: 'agenda', value: null };
  assert.equal((await request('/api/mobile/lia-worker/result', { id, lease: job.lease, result: { action } }, worker)).status, 200);
  const snapshot = api.exportSnapshot(); api.importSnapshot(snapshot);
  const result = await request(`${prefix}/${id}`, undefined, auth); assert.deepEqual(result.body.data.result, { action });
  assert.equal(result.body.data.state, 'completed'); assert.equal('lease' in result.body.data, false);
});
