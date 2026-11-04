// Seletor do idioma da demonstração (Pro e Paciente). Trocar recria os dados fictícios no novo
// idioma, então pede confirmação antes; o servidor só responde depois de reiniciar a demo.

import React, { useState } from 'react';
import { idiomaAtual, trocarIdioma, tr, type Idioma } from '../idioma';

const OPCOES: { idioma: Idioma; sigla: string; nome: string }[] = [
  { idioma: 'pt-BR', sigla: 'PT', nome: 'Português' },
  { idioma: 'en-US', sigla: 'EN', nome: 'English' },
];

export const SeletorIdioma: React.FC<{ tamanho?: 'compacto' | 'app'; className?: string }> = ({ tamanho = 'compacto', className = '' }) => {
  const [trocando, setTrocando] = useState(false);
  const [erro, setErro] = useState('');
  const atual = idiomaAtual();

  const escolher = async (idioma: Idioma) => {
    if (idioma === atual || trocando) return;
    const ok = window.confirm(
      tr(
        'Trocar o idioma reinicia os dados da demonstração. Continuar?',
        'Changing the language restarts the demo data. Continue?'
      )
    );
    if (!ok) return;
    setTrocando(true);
    setErro('');
    try {
      await trocarIdioma(idioma);
    } catch (e) {
      setErro((e as Error).message);
      setTrocando(false);
    }
  };

  const botao = tamanho === 'app' ? 'min-w-12 min-h-12 px-4' : 'min-w-11 px-3 py-1.5';
  return (
    <div className={className}>
      <div role="group" aria-label={tr('Idioma da demonstração', 'Demo language')} className="inline-flex gap-1 rounded-full bg-gelo p-1 text-sm">
        {OPCOES.map(({ idioma, sigla, nome }) => (
          <button
            key={idioma}
            type="button"
            lang={idioma}
            aria-label={nome}
            title={nome}
            aria-pressed={idioma === atual}
            disabled={trocando}
            onClick={() => void escolher(idioma)}
            className={`${botao} rounded-full font-semibold cursor-pointer disabled:cursor-wait ${
              idioma === atual ? 'bg-white text-azul shadow-sm' : 'text-tinta-suave hover:text-azul'
            }`}
          >
            {sigla}
          </button>
        ))}
      </div>
      {erro && <p role="alert" className="mt-1 text-xs text-urgente">{erro}</p>}
    </div>
  );
};
