// Idioma da demonstração, único para o OncoFlow Pro, o OncoFlow Paciente e o servidor. Português é o
// padrão. Trocar o idioma recria o seed nesse idioma (POST /api/demo/idioma), então dados fictícios,
// planos e respostas da Lia nunca misturam idiomas.
//
// O servidor importa este módulo como importa src/types.ts e guarda o idioma junto com o estado.
// Lá, `tr` só pode ser chamado no momento do uso (dentro de funções ou getters): o idioma salvo é
// carregado depois que os módulos já foram importados. No navegador, main.tsx espera
// `carregarIdioma()` antes de importar as telas, e trocar o idioma recarrega a página.

export type Idioma = 'pt-BR' | 'en-US';
export const IDIOMAS: readonly Idioma[] = ['pt-BR', 'en-US'];

let atual: Idioma = 'pt-BR';

export function idiomaAtual(): Idioma {
  return atual;
}

export function definirIdioma(idioma: Idioma): void {
  atual = idioma;
}

export function ehIdioma(valor: unknown): valor is Idioma {
  return typeof valor === 'string' && (IDIOMAS as readonly string[]).includes(valor);
}

/** Escolhe o texto do idioma atual. */
export function tr<T>(pt: T, en: T): T {
  return atual === 'en-US' ? en : pt;
}

// --- Navegador ---

export async function carregarIdioma(): Promise<void> {
  let idioma: Idioma = 'pt-BR';
  try {
    const resposta = await fetch('/api/demo/idioma');
    if (resposta.ok) {
      const dados = (await resposta.json()) as { idioma?: unknown };
      if (ehIdioma(dados.idioma)) idioma = dados.idioma;
    }
  } catch {
    // Sem servidor, a interface fica em português.
  }
  definirIdioma(idioma);
  document.documentElement.lang = idioma;
}

/**
 * Se outra tela (Pro ou Paciente) trocar o idioma, os dados já foram recriados no servidor:
 * recarrega esta página para a interface acompanhar, em vez de misturar idiomas.
 */
export function acompanharIdioma(intervaloMs = 5000): void {
  const conferir = async () => {
    try {
      const resposta = await fetch('/api/demo/idioma', { cache: 'no-store' });
      if (!resposta.ok) return;
      const { idioma } = (await resposta.json()) as { idioma?: unknown };
      if (ehIdioma(idioma) && idioma !== atual) window.location.reload();
    } catch {
      // Sem conexão: tenta de novo no próximo ciclo.
    }
  };
  window.setInterval(() => void conferir(), intervaloMs);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void conferir();
  });
}

/** Reinicia a demo no novo idioma e recarrega a página. */
export async function trocarIdioma(idioma: Idioma): Promise<void> {
  const resposta = await fetch('/api/demo/idioma', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idioma }),
  });
  if (!resposta.ok) throw new Error(tr('Não foi possível trocar o idioma.', 'Could not change the language.'));
  window.location.reload();
}
