import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { NextFunction, Request, Response } from 'express';
import { criarApi } from './api';
import { resetar } from './estado';
import { AUDIO_MAX_BYTES, hostDoServidor, limitarTaxa, protegerRotasLocais, validarAudio } from './seguranca';

async function abrir(t: import('node:test').TestContext, options: Parameters<typeof criarApi>[0] = {}) {
  resetar(); const api = criarApi({ statePath: null, ...options });
  const server = api.app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(async () => { api.dispose(); await new Promise<void>(resolve => server.close(() => resolve())); });
  const a = server.address(); assert.ok(a && typeof a !== 'string');
  return `http://127.0.0.1:${a.port}`;
}

function simular(path: string, method: string, remoteAddress: string) {
  const req = { path, method, socket: { remoteAddress } } as unknown as Request;
  let status = 0; let corpo: unknown; const headers: Record<string, string> = {};
  const res = { status(s: number) { status = s; return res; }, json(b: unknown) { corpo = b; return res; }, setHeader(k: string, v: string) { headers[k] = v; } } as unknown as Response;
  let seguiu = false; const next: NextFunction = () => { seguiu = true; };
  return { req, res, next, resultado: () => ({ status, corpo, seguiu, headers }) };
}

test('every response carries security headers and the health check hides provider keys', async t => {
  const origin = await abrir(t);
  const res = await fetch(`${origin}/api/health`);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.match(res.headers.get('content-security-policy') ?? '', /frame-ancestors 'self'/);
  assert.match(res.headers.get('permissions-policy') ?? '', /microphone=\(self\)/);
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(res.headers.get('x-powered-by'), null);
  const body = await res.json();
  assert.equal('hasApiKey' in body, false);
});

test('Pro, demo controls and the fixed patient session only answer this computer', () => {
  const bloqueadas: [string, string][] = [
    ['/api/pro/pacientes', 'GET'], ['/api/pro/pacientes/pac-maria/barreiras', 'POST'],
    ['/api/demo/reset', 'POST'], ['/api/demo/usuarios', 'GET'], ['/api/demo/idioma', 'POST'],
    ['/api/paciente/inicio', 'GET'], ['/api/transcrever-audio', 'POST'],
  ];
  for (const [path, method] of bloqueadas) {
    const remoto = simular(path, method, '192.168.0.42'); protegerRotasLocais(remoto.req, remoto.res, remoto.next);
    assert.equal(remoto.resultado().status, 403, `${method} ${path} deveria recusar a rede`);
    assert.equal(remoto.resultado().seguiu, false);
    for (const local of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) {
      const daqui = simular(path, method, local); protegerRotasLocais(daqui.req, daqui.res, daqui.next);
      assert.equal(daqui.resultado().seguiu, true, `${method} ${path} deveria aceitar ${local}`);
    }
  }
  // The phone app has its own pairing and sessions; reading the language and the worker stay open.
  for (const [path, method] of [['/api/mobile/pair', 'POST'], ['/api/v1/tenants/demo/hospitals/oncoflow/patients/pac-maria/summary', 'GET'], ['/api/demo/idioma', 'GET'], ['/api/mobile/lia-worker/claim', 'POST'], ['/api/health', 'GET']]) {
    const remoto = simular(path, method, '192.168.0.42'); protegerRotasLocais(remoto.req, remoto.res, remoto.next);
    assert.equal(remoto.resultado().seguiu, true, `${method} ${path} deveria seguir aberto`);
  }
});

test('rate limit answers 429 with Retry-After and keeps origins apart', () => {
  const limite = limitarTaxa('teste', 2, 60_000, req => req.socket.remoteAddress ?? '?');
  const chamar = (ip: string) => { const s = simular('/api/x', 'POST', ip); limite(s.req, s.res, s.next); return s.resultado(); };
  assert.equal(chamar('10.0.0.1').seguiu, true);
  assert.equal(chamar('10.0.0.1').seguiu, true);
  const terceiro = chamar('10.0.0.1');
  assert.equal(terceiro.status, 429); assert.ok(Number(terceiro.headers['Retry-After']) > 0);
  assert.equal(chamar('10.0.0.2').seguiu, true);
});

test('demo resets are rate limited over HTTP', async t => {
  const origin = await abrir(t);
  const status: number[] = [];
  for (let i = 0; i < 22; i++) status.push((await fetch(`${origin}/api/demo/reset`, { method: 'POST' })).status);
  assert.ok(status.slice(0, 20).every(s => s !== 429));
  assert.equal(status.at(-1), 429);
});

test('audio is checked for type, size and encoding before reaching the transcription vendor', () => {
  assert.equal(validarAudio('AAAA', 'audio/webm;codecs=opus'), 'audio/webm');
  assert.equal(validarAudio('AAAA', undefined), 'audio/webm');
  assert.throws(() => validarAudio('', 'audio/webm'), (e: { status: number }) => e.status === 400);
  assert.throws(() => validarAudio('AAAA', 'text/html'), (e: { status: number }) => e.status === 415);
  assert.throws(() => validarAudio('AAAA', 'application/pdf'), (e: { status: number }) => e.status === 415);
  assert.throws(() => validarAudio('not base64!', 'audio/webm'), (e: { status: number }) => e.status === 400);
  assert.throws(() => validarAudio('A'.repeat(Math.ceil(AUDIO_MAX_BYTES / 3) * 4 + 4), 'audio/webm'), (e: { status: number }) => e.status === 413);
});

test('the local server listens only on this computer unless the network is asked for', () => {
  assert.equal(hostDoServidor({}), '127.0.0.1');
  assert.equal(hostDoServidor({ ONCOFLOW_REDE_LOCAL: 'false' }), '127.0.0.1');
  assert.equal(hostDoServidor({ ONCOFLOW_REDE_LOCAL: 'true' }), '0.0.0.0');
});
