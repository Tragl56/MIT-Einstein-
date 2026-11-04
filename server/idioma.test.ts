import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Server } from 'node:http';
import { criarApi } from './api';
import { definirIdioma, idiomaAtual } from '../src/idioma';

const equipe = { 'x-demo-usuario': 'usr-rodrigo' };
const paciente = { authorization: 'Bearer demo-maria' };

test('demo language: Portuguese by default, switching recreates the fictional seed and is saved', async () => {
  const testsRoot = path.resolve('outputs/.oncoflow-demo/tests');
  mkdirSync(testsRoot, { recursive: true });
  const folder = mkdtempSync(path.join(testsRoot, 'idioma-'));
  const statePath = path.join(folder, 'state.json');
  let api: ReturnType<typeof criarApi>;
  let server: Server;
  let origin = '';
  let aberto = false;
  const start = async () => {
    api = criarApi({ statePath });
    await new Promise<void>((resolve) => { server = api.app.listen(0, '127.0.0.1', resolve); });
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    origin = `http://127.0.0.1:${address.port}`;
    aberto = true;
  };
  const stop = async () => {
    aberto = false;
    api.dispose();
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  };
  const call = async (url: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) => {
    const response = await fetch(origin + url, {
      method,
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  };
  const maria = async () => (await call('/api/pro/estado', 'GET', undefined, equipe)).body.pacientes.find((p: any) => p.id === 'pac-maria');
  const camila = async () => (await call('/api/demo/usuarios')).body.usuarios.find((u: any) => u.id === 'usr-camila');
  // A Lia responde e costuma emendar uma pergunta de acompanhamento: olhar as últimas falas.
  const falasDaLia = (inicio: any) => inicio.conversa.filter((m: any) => m.autor === 'lia').slice(-3).map((m: any) => m.texto).join(' ');

  try {
    await start();
    assert.deepEqual((await call('/api/demo/idioma')).body, { idioma: 'pt-BR' });
    assert.equal((await camila()).nome, 'Dra. Camila Ribeiro');
    assert.match((await maria()).diagnosticoResumido, /^Carcinoma de mama invasivo/);
    const pt = await call('/api/paciente/conversa', 'POST', { texto: 'Quando é minha próxima consulta?', origem: 'texto' }, paciente);
    assert.equal(pt.status, 200);
    assert.match(falasDaLia(pt.body), /consulta/i);

    // Something done in the demo, then the switch: the data starts over in the new language.
    await call('/api/pro/pacientes/pac-maria/mensagens', 'POST', { texto: 'Mensagem fictícia da equipe.' }, equipe);
    assert.ok((await maria()).mensagens.some((m: any) => m.texto === 'Mensagem fictícia da equipe.'));
    assert.equal((await call('/api/demo/idioma', 'POST', { idioma: 'fr-FR' })).status, 400);
    assert.deepEqual((await call('/api/demo/idioma', 'POST', { idioma: 'en-US' })).body, { idioma: 'en-US' });
    assert.equal((await camila()).nome, 'Dr. Camila Ribeiro');
    const depois = await maria();
    assert.match(depois.diagnosticoResumido, /^Invasive breast carcinoma/);
    assert.ok(!depois.mensagens.some((m: any) => m.texto === 'Mensagem fictícia da equipe.'));
    const en = await call('/api/paciente/conversa', 'POST', { texto: 'When is my next appointment?', origem: 'texto' }, paciente);
    assert.match(falasDaLia(en.body), /appointment/i);
    await stop();

    // The saved state brings the language back after a restart.
    definirIdioma('pt-BR');
    await start();
    assert.deepEqual((await call('/api/demo/idioma')).body, { idioma: 'en-US' });
    assert.match((await maria()).diagnosticoResumido, /^Invasive breast carcinoma/);
    await stop();

    // A state saved before the bilingual demo has no language and was generated in English.
    const salvo = JSON.parse(readFileSync(statePath, 'utf8'));
    delete salvo.state.idioma;
    writeFileSync(statePath, JSON.stringify(salvo));
    definirIdioma('pt-BR');
    await start();
    assert.equal(idiomaAtual(), 'en-US');
    await stop();
  } finally {
    if (aberto) await stop();
    rmSync(folder, { recursive: true, force: true });
  }
});
