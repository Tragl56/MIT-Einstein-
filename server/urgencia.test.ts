import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detectarUrgencia } from './urgencia';

test('fictional service terms detect Portuguese and English reports without assigning clinical priority', () => {
  for (const report of [
    'Estou com muita falta de ar agora.',
    'Estou com febre.',
    'Sinto dor no peito.',
    'Não consigo respirar.',
    'Há sangue na urina.',
    'I have a fever now.',
    'I am short of breath.',
    "I can't breathe.",
    'Sem febre, mas estou com falta de ar.',
    'Não tenho febre, mas estou com dor no peito.',
  ]) {
    const found = detectarUrgencia(report);
    assert.ok(found, report);
    assert.deepEqual(Object.keys(found), ['termo']);
  }
});

test('simple Portuguese and English negations do not create a textual hypothesis', () => {
  for (const report of [
    'Estou sem febre.',
    'Não tenho falta de ar.',
    'Não sinto dor no peito.',
    'Não estou com febre.',
    'Não estou sentindo dor forte.',
    'Não tenho mais falta de ar.',
    'Não tenho febre nem falta de ar.',
    'No fever.',
    "I don't have a fever.",
    "I'm not short of breath.",
    'Without severe pain.',
    'Feverishness is not a whole-word match.',
  ]) assert.equal(detectarUrgencia(report), undefined, report);
});
