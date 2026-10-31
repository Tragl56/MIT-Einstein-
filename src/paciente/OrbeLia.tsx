// Símbolo da Lia: orbe abstrato, sem rosto nem mascote (conceito, seção 4). Reconhecível parado,
// funciona pequeno, e o estado sempre aparece também em texto (nunca só pela animação).

import React from 'react';

export type EstadoOrbe = 'espera' | 'ouvindo' | 'processando' | 'falando' | 'concluido';

export const ROTULO_ORBE: Record<EstadoOrbe, string> = {
  espera: 'Lia disponível',
  ouvindo: 'Ouvindo',
  processando: 'Consultando suas informações',
  falando: 'Lia falando',
  concluido: 'Pronto',
};

interface OrbeLiaProps {
  estado: EstadoOrbe;
  tamanho?: number;
  mostrarRotulo?: boolean;
}

export const OrbeLia: React.FC<OrbeLiaProps> = ({ estado, tamanho = 160, mostrarRotulo = false }) => (
  <div className="flex flex-col items-center gap-3">
    <div
      role="img"
      aria-label={ROTULO_ORBE[estado]}
      className={`relative rounded-full orbe-${estado === 'concluido' ? 'espera' : estado}`}
      style={{ width: tamanho, height: tamanho }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 32% 28%, var(--color-gelo) 0%, var(--color-turquesa) 38%, var(--color-verde) 68%, var(--color-azul) 100%)',
          boxShadow: '0 10px 40px -12px var(--color-turquesa)',
        }}
      />
      <div
        className="orbe-camada absolute inset-[8%] rounded-full opacity-60"
        style={{
          background:
            'conic-gradient(from 90deg, transparent 0deg, var(--color-gelo) 70deg, transparent 150deg, var(--color-turquesa) 240deg, transparent 320deg)',
          filter: 'blur(6px)',
        }}
      />
    </div>
    {mostrarRotulo && (
      <p aria-live="polite" className="text-base font-semibold text-azul">
        {ROTULO_ORBE[estado]}
      </p>
    )}
  </div>
);
