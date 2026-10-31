import React from 'react';

// Símbolo do OncoFlow (mockup de desktop do time): esfera turquesa formada por duas faixas que se
// entrelaçam em volta de uma abertura em "S", sugerindo a letra O e a ideia de fluxo.
export const LogoOncoFlow: React.FC<{ className?: string }> = ({ className }) => {
  const id = React.useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 40 40" className={className} role="img" aria-label="OncoFlow">
      <defs>
        <linearGradient id={`${id}-corpo`} x1="0.85" y1="0.1" x2="0.15" y2="0.95">
          <stop offset="0" style={{ stopColor: 'var(--color-logo-escuro)' }} />
          <stop offset="0.55" style={{ stopColor: 'var(--color-logo-medio)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-logo-claro)' }} />
        </linearGradient>
        <radialGradient id={`${id}-brilho`} cx="0.3" cy="0.25" r="0.6">
          <stop offset="0" stopColor="white" stopOpacity="0.55" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}-abertura`}>
          <rect width="40" height="40" fill="white" />
          <path d="M7 16C11 8 19 9 21.5 15C23.5 20 27 23.5 33 24C29 32 20 31.5 18 25.5C16.5 20.5 12.5 16.5 7 16Z" fill="black" />
        </mask>
      </defs>
      <g mask={`url(#${id}-abertura)`}>
        <circle cx="20" cy="20" r="18" fill={`url(#${id}-corpo)`} />
        <circle cx="20" cy="20" r="18" fill={`url(#${id}-brilho)`} />
        {/* faixa clara na borda da abertura dá a sensação de volume das duas fitas */}
        <path
          d="M7 16C11 8 19 9 21.5 15C23.5 20 27 23.5 33 24"
          fill="none"
          stroke="white"
          strokeOpacity="0.45"
          strokeWidth="2.5"
        />
      </g>
    </svg>
  );
};
