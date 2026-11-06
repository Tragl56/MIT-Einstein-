import assert from 'node:assert/strict';
import { test } from 'node:test';
import { criarApi } from './api';
import { exportarEstado, resetar } from './estado';

test('the team grants the patient app access with a code, sees it and revokes it at once', async t => {
  resetar(); const api = criarApi({ statePath: null, autoConnect: false });
  const server = api.app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(async () => { api.dispose(); await new Promise<void>(resolve => server.close(() => resolve())); });
  const a = server.address(); assert.ok(a && typeof a !== 'string'); const origin = `http://127.0.0.1:${a.port}`;
  const team = { 'x-demo-usuario': 'usr-camila' };
  async function call(path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetch(origin + path, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  }
  const access = '/api/pro/pacientes/pac-maria/mobile-acesso';
  const summary = '/api/v1/tenants/demo/hospitals/oncoflow/patients/pac-maria/summary';

  // Without auto-connect, nobody enters without a code from the team.
  assert.equal((await call('/api/mobile/demo-session', 'POST', { patientId: 'pac-maria' })).status, 403);
  // Only the team sees or ends access.
  assert.equal((await call(access)).status, 401);
  assert.equal((await call(`${access}/revogar`, 'POST', {})).status, 401);
  assert.deepEqual((await call(access, 'GET', undefined, team)).body, { activeSessions: 0, sessionExpiresAt: null, pendingCodeExpiresAt: null, demo: true });

  const code = await call('/api/pro/pacientes/pac-maria/mobile-pairing', 'POST', {}, team);
  assert.equal(code.status, 200);
  assert.ok((await call(access, 'GET', undefined, team)).body.pendingCodeExpiresAt);
  const paired = await call('/api/mobile/pair', 'POST', { code: code.body.code });
  assert.equal(paired.status, 200);
  const patient = { Authorization: `Bearer ${paired.body.accessToken}` };
  assert.equal((await call(summary, 'GET', undefined, patient)).status, 200);
  const granted = (await call(access, 'GET', undefined, team)).body;
  assert.equal(granted.activeSessions, 1); assert.equal(granted.pendingCodeExpiresAt, null); assert.ok(granted.sessionExpiresAt);
  assert.equal(JSON.stringify(granted).includes(paired.body.accessToken), false);

  // A second code left unused is cancelled by the revocation too.
  const unused = await call('/api/pro/pacientes/pac-maria/mobile-pairing', 'POST', {}, team);
  const revoked = await call(`${access}/revogar`, 'POST', {}, team);
  assert.equal(revoked.status, 200); assert.equal(revoked.body.ended, 1); assert.equal(revoked.body.activeSessions, 0);
  assert.equal((await call(summary, 'GET', undefined, patient)).status, 401);
  assert.equal((await call('/api/mobile/pair', 'POST', { code: unused.body.code })).status, 401);

  // Revoking one patient leaves another patient's access alone.
  const outro = await call('/api/mobile/pair', 'POST', { code: (await call('/api/pro/pacientes/pac-001/mobile-pairing', 'POST', {}, team)).body.code });
  await call(`${access}/revogar`, 'POST', {}, team);
  assert.equal((await call('/api/v1/tenants/demo/hospitals/oncoflow/patients/pac-001/summary', 'GET', undefined, { Authorization: `Bearer ${outro.body.accessToken}` })).status, 200);

  const audit = JSON.stringify(exportarEstado());
  assert.ok(audit.includes('emitiu_pareamento_mobile_demo'));
  assert.ok(audit.includes('revogou_acesso_mobile_demo'));
});
