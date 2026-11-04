// Lia no idioma da demo. As regras de interpretação e os modelos de resposta são escritos para
// cada idioma (lia.pt.ts e lia.en.ts têm a mesma lógica); aqui só se escolhe a versão na hora do
// uso, porque o idioma muda com POST /api/demo/idioma.

import type { StatusResultado } from '../src/types';
import { idiomaAtual } from '../src/idioma';
import * as liaEn from './lia.en';
import * as liaPt from './lia.pt';

const lia = () => (idiomaAtual() === 'en-US' ? liaEn : liaPt);

export function verificarAfirmacoes(texto: string, status: StatusResultado | undefined): string {
  return lia().verificarAfirmacoes(texto, status);
}

export function mensagemDoPaciente(pacienteId: string, texto: string, origem: 'texto' | 'voz'): void {
  lia().mensagemDoPaciente(pacienteId, texto, origem);
}

export function classificar(t: string): ReturnType<typeof liaPt.classificar> | ReturnType<typeof liaEn.classificar> {
  return lia().classificar(t);
}

export function responderProposta(pacienteId: string, token: string, aceitar: boolean): void {
  lia().responderProposta(pacienteId, token, aceitar);
}
