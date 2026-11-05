import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCloudApp } from './cloudGateway';
import type { SnapshotStore } from './cloudStore';

test('cloud receipts follow durable commit, retry is idempotent, sessions survive a fresh app', async t => {
  let saved: any = null;
  let fail = false;
  let gate: Promise<void> | undefined;
  const store: SnapshotStore = { async begin() { return {
    snapshot: structuredClone(saved),
    async commit(snapshot) { if (gate) await gate; if (fail) throw new Error('write failure'); saved = structuredClone(snapshot); },
    async rollback() {},
  }; } };
  const servers: ReturnType<ReturnType<typeof createCloudApp>['listen']>[] = [];
  async function start() {
    const app = createCloudApp(store);
    const server = app.listen(0, '127.0.0.1'); servers.push(server);
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    return `http://127.0.0.1:${address.port}`;
  }
  t.after(async () => { await Promise.all(servers.map(s => new Promise<void>(resolve => s.close(() => resolve())))); });
  const origin = await start();
  async function post(path: string, body: unknown, token?: string, base = origin) {
    const key = typeof body === 'object' && body && 'idempotencyKey' in body ? String(body.idempotencyKey) : undefined;
    return fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(key ? { 'Idempotency-Key': key } : {}) }, body: JSON.stringify(body) });
  }
  const login = await post('/api/mobile/demo-session', { patientId: 'pac-maria' });
  assert.equal(login.status, 200);
  const { accessToken } = await login.json() as { accessToken: string };
  const path = '/api/v1/tenants/demo/hospitals/oncoflow/patients/pac-maria';
  const now = new Date().toISOString();
  const payload = { feeling: 'Bem', recordedAt: now, idempotencyKey: 'durable-receipt', confirmation: { confirmed: true, confirmedAt: now } };
  let release!: () => void;
  gate = new Promise<void>(resolve => { release = resolve; });
  let acknowledged = false;
  const pending = post(path + '/wellbeing', payload, accessToken).then(r => { acknowledged = true; return r; });
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(acknowledged, false, 'no success response before durable commit');
  release();
  assert.equal((await pending).status, 200); gate = undefined;
  assert.equal(Object.keys(saved.extras.wellbeing).length, 1);
  assert.equal((await post(path + '/wellbeing', payload, accessToken)).status, 200);
  assert.equal(Object.keys(saved.extras.wellbeing).length, 1, 'retry never duplicates the record');
  fail = true;
  assert.equal((await post(path + '/wellbeing', { ...payload, idempotencyKey: 'retry-after-failure' }, accessToken)).status, 503);
  assert.equal(Object.keys(saved.extras.wellbeing).length, 1);
  fail = false;
  const freshOrigin = await start();
  const summary = await fetch(freshOrigin + path + '/summary', { headers: { Authorization: `Bearer ${accessToken}` } });
  assert.equal(summary.status, 200, 'session loaded from persisted snapshot');
  const retries = await Promise.all([1, 2].map(() => post(path + '/wellbeing', { ...payload, idempotencyKey: 'retry-after-failure' }, accessToken, freshOrigin)));
  assert.deepEqual(retries.map(r => r.status), [200, 200]);
  assert.equal(Object.keys(saved.extras.wellbeing).length, 2, 'concurrent duplicate writes commit once');
});
