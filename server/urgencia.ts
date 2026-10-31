// Detector de possível urgência. Roda ANTES de qualquer outra interpretação da mensagem.
// A lista de termos vem da configuração do serviço; aqui só existe a mecânica de comparação.
// O resultado nunca é exibido como fato: para a equipe é uma "hipótese do sistema" a revisar,
// e para o paciente é o aviso de urgência aprovado pelo hospital.

import { CONFIG_SERVICO } from './configServico';
import { normalizar } from './util';

// Negações simples imediatamente antes do termo ("no fever", "I don't have a fever anymore").
// O texto já vem normalizado, então "don't" chega como "don t".
const NEGACOES = ['no', 'not', 'without', 'don t have', 'didn t have', 'don t feel', 'haven t had', 'never had', 'free of'];

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function detectarUrgencia(texto: string): { termo: string } | undefined {
  const t = normalizar(texto);
  for (const termo of CONFIG_SERVICO.termosUrgencia) {
    const regex = new RegExp(`(^|\\s)${escaparRegex(normalizar(termo))}(?=\\s|$)`, 'g');
    let achado: RegExpExecArray | null;
    while ((achado = regex.exec(t))) {
      const antes = t.slice(Math.max(0, achado.index - 30), achado.index).trim();
      const negado = NEGACOES.some((neg) => new RegExp(`(^|\\s)${neg}(\\s+\\w+)?$`).test(antes));
      if (!negado) return { termo };
    }
  }
  return undefined;
}
