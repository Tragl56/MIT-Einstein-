import React from 'react';

// Versão estática e pequena do orbe da Lia, para rótulos no OncoFlow Pro.
export const OrbeMini: React.FC<{ className?: string }> = ({ className }) => (
  <span
    aria-hidden
    className={`inline-block rounded-full shrink-0 ${className ?? ''}`}
    style={{ background: 'radial-gradient(circle at 35% 30%, var(--color-gelo), var(--color-turquesa) 45%, var(--color-azul))' }}
  />
);
