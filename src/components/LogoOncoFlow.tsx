import React from 'react';

// Símbolo e assinatura do kit de marca OncoFlow AI v1.0 ("Percurso" com F invertido na haste direita).
// Os traçados vêm de public/brand/oncoflow-simbolo-*.svg; não redesenhar nem redigitar o logo.
const TRACADO_ESQUERDO =
  'M80 223A55 55 0 0 1 25 168V88A55 55 0 0 1 80 33H108A55 55 0 0 1 163 88V96A15 15 0 0 1 133 96V88A25 25 0 0 0 108 63H80A25 25 0 0 0 55 88V168A25 25 0 0 0 80 193A15 15 0 0 1 80 223Z';
const TRACADO_DIREITO =
  'M176 33A55 55 0 0 1 231 88V168A55 55 0 0 1 176 223H148A55 55 0 0 1 93 168V144A15 15 0 0 1 123 144V168A25 25 0 0 0 148 193H176A25 25 0 0 0 201 168V155H164A15 15 0 0 1 164 125H201V88A25 25 0 0 0 176 63A15 15 0 0 1 176 33Z';

type Versao = 'colorido' | 'fundo-escuro';

const CORES: Record<Versao, [string, string]> = {
  colorido: ['var(--color-azul)', 'var(--color-teal)'],
  'fundo-escuro': ['#FFFFFF', 'var(--color-turquesa)'],
};

/** Símbolo da marca. Use `fundo-escuro` sobre azul profundo. */
export const LogoOncoFlow: React.FC<{ className?: string; versao?: Versao; decorativo?: boolean }> = ({
  className,
  versao = 'colorido',
  decorativo = false,
}) => {
  const [esquerda, direita] = CORES[versao];
  return (
    <svg
      viewBox="0 0 256 256"
      className={className}
      {...(decorativo ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'OncoFlow AI' })}
    >
      <path d={TRACADO_ESQUERDO} fill={esquerda} />
      <path d={TRACADO_DIREITO} fill={direita} />
    </svg>
  );
};

/** Assinatura horizontal oficial (símbolo + "OncoFlow AI" em contornos), proporção 811 × 256. */
export const AssinaturaOncoFlow: React.FC<{ className?: string; versao?: Versao }> = ({ className, versao = 'colorido' }) => (
  <img src={`/brand/oncoflow-horizontal-${versao}.svg`} alt="OncoFlow AI" className={className} width={811} height={256} />
);
