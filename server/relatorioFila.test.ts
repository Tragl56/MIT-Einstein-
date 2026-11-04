import assert from 'node:assert/strict';
import { test } from 'node:test';
import { relatorioFila } from '../src/domain/relatorioFila';
import { itensFila } from '../src/domain/fila';
import { resetar } from './estado';
import { visaoPro } from './visoes';

test('report separates current workload from period events using São Paulo calendar boundaries', () => {
  resetar(); const estado = visaoPro(); const patient = estado.pacientes[0]; const user = estado.usuarios[0];
  const now = Date.parse('2030-01-08T02:59:59Z'); // Still Jan 7 in São Paulo.
  const common = { ...estado.pacientes.flatMap(p => p.pendencias)[0], responsavelId: user.id, responsavel: 'Old name', historico: undefined };
  const items = itensFila([{ ...patient, pendencias: [
    { ...common, id: 'old-open', criadaEm: '2029-12-01T12:00:00Z', prazo: '2030-01-07T00:00:00Z', estado: 'aberta' },
    { ...common, id: 'before', criadaEm: '2030-01-01T02:59:59Z', concluidaEm: '2030-01-01T03:00:00Z', estado: 'concluida' },
    { ...common, id: 'start', criadaEm: '2030-01-01T03:00:00Z', concluidaEm: '2030-01-01T05:00:00Z', estado: 'concluida' },
    { ...common, id: 'today', criadaEm: '2030-01-08T02:00:00Z', estado: 'aberta', responsavelId: undefined, responsavel: undefined, prazo: '2030-01-09T03:00:00Z' },
    { ...common, id: 'future', criadaEm: '2030-01-08T03:00:00Z', concluidaEm: '2030-01-08T05:00:00Z', estado: 'concluida' },
    { ...common, id: 'bad-duration', criadaEm: 'bad', concluidaEm: '2030-01-07T12:00:00Z', estado: 'concluida' },
  ] }]);
  const r = relatorioFila(items, estado.usuarios, now, 7);
  assert.equal(r.inicio, '2030-01-01'); assert.equal(r.fim, '2030-01-07'); assert.equal(r.serie.length, 7);
  assert.equal(r.criadas, 2); assert.equal(r.concluidas, 3); assert.equal(r.amostra, 2);
  assert.equal(r.medianaHoras, (2 + 1 / 3600) / 2);
  assert.equal(r.conclusoesSemDuracao, 1); assert.equal(r.datasInvalidas, 2);
  assert.deepEqual(r.serie[0], { dia: '2030-01-01', criadas: 1, concluidas: 2 });
  assert.deepEqual(r.serie[6], { dia: '2030-01-07', criadas: 1, concluidas: 1 });
  const assigned = r.equipes.find(e => e.id === user.id)!;
  assert.equal(assigned.nome, user.nome); assert.equal(assigned.abertas, 1); assert.equal(assigned.vencidas, 1); assert.equal(assigned.concluidas, 3);
  assert.equal(r.equipes.find(e => e.id === 'sem-responsavel')?.abertas, 1);
  assert.equal(relatorioFila(items, estado.usuarios, now, 30).serie.length, 30);
});

test('report handles no data and excludes reversed durations without discarding completion events', () => {
  const now = Date.parse('2030-01-10T12:00:00Z');
  const empty = relatorioFila([], [], now, 7);
  assert.equal(empty.medianaHoras, null); assert.equal(empty.amostra, 0); assert.deepEqual(empty.equipes, []);
  resetar(); const state = visaoPro(); const patient = state.pacientes[0];
  const p = state.pacientes.flatMap(p => p.pendencias)[0];
  const r = relatorioFila(itensFila([{ ...patient, pendencias: [{ ...p, estado: 'concluida', criadaEm: '2030-01-10T10:00:00Z', concluidaEm: '2030-01-09T10:00:00Z' }] }]), state.usuarios, now, 7);
  assert.equal(r.concluidas, 1); assert.equal(r.amostra, 0); assert.equal(r.medianaHoras, null); assert.equal(r.datasInvalidas, 1);
});
