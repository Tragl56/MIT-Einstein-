import React from 'react';

// Símbolo provisório: caminho contínuo que sugere a letra O e a ideia de fluxo (direção de marca,
// seção 11). Evita cruz médica, laço e coração. Substituir quando houver o logo definitivo.
export const LogoOncoFlow: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} role="img" aria-label="OncoFlow">
    <defs>
      <linearGradient id="logo-oncoflow-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" style={{ stopColor: 'var(--color-turquesa)' }} />
        <stop offset="1" style={{ stopColor: 'var(--color-azul)' }} />
      </linearGradient>
    </defs>
    <rect width="40" height="40" rx="11" style={{ fill: 'var(--color-gelo)' }} />
    <path
      d="M20 8c6.6 0 12 5.4 12 12s-5.4 12-12 12c-4.6 0-8.2-2.9-8.2-7 0-3.6 2.9-6.2 6.4-6.2 2.8 0 4.9 1.9 4.9 4.3"
      fill="none"
      stroke="url(#logo-oncoflow-grad)"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);
