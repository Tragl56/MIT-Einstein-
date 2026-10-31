import React, { useId } from 'react';

/** Folded O symbol, matching the translucent ribbon identity of the concept cover. */
export const LogoOncoFlow: React.FC<{ className?: string }> = ({ className }) => {
  const id = useId().replace(/:/g, '');
  const contour = 'M48 4C23 4 7 23 7 48C7 74 23 92 48 92C74 92 90 74 90 48C90 22 73 4 48 4ZM48 25C60 25 67 34 67 48C67 63 60 72 48 72C36 72 29 62 29 48C29 34 36 25 48 25Z';
  return <svg viewBox="0 0 96 96" className={className} role="img" aria-label="OncoFlow">
    <defs>
      <linearGradient id={id + '-base'} x1=".1" y1=".08" x2=".9" y2=".9">
        <stop stopColor="var(--lia-glass-light)" /><stop offset=".4" stopColor="var(--lia-aqua)" /><stop offset="1" stopColor="var(--lia-blue)" />
      </linearGradient>
      <linearGradient id={id + '-ribbon'} x1="20" y1="15" x2="75" y2="78" gradientUnits="userSpaceOnUse">
        <stop stopColor="var(--lia-glass-light)" /><stop offset=".48" stopColor="var(--lia-cyan)" /><stop offset="1" stopColor="var(--lia-blue)" />
      </linearGradient>
      <clipPath id={id + '-clip'}><path d={contour} fillRule="evenodd" /></clipPath>
    </defs>
    <path d={contour} fillRule="evenodd" fill={'url(#' + id + '-base)'} />
    <g clipPath={'url(#' + id + '-clip)'}>
      <path d="M40-1C75 0 88 20 77 41C68 58 56 51 56 41C55 17 31 30 22 14Z" fill={'url(#' + id + '-ribbon)'} />
      <path d="M85 31C107 72 63 99 40 88C24 81 25 65 36 63C55 59 56 83 75 65C87 52 71 44 85 31Z" fill={'url(#' + id + '-ribbon)'} opacity=".87" />
      <path d="M9 30C20 20 29 32 30 46C30 63 53 68 51 84C48 100 7 83 2 60Z" fill={'url(#' + id + '-base)'} opacity=".95" />
      <path d="M16 25C28 12 36 25 48 27M61 66C74 78 81 66 85 55" stroke="white" strokeWidth="1.3" strokeOpacity=".65" />
    </g>
  </svg>;
};
