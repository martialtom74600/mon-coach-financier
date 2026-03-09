'use client';

import React from 'react';

export interface TooltipProps {
  text: string;
}

/**
 * Infobulle affichée au survol du parent.
 * Le parent doit avoir les classes `group relative` pour que le hover fonctionne.
 */
export default function Tooltip({ text }: TooltipProps) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:translate-y-0 translate-y-1 whitespace-nowrap pointer-events-none z-20 shadow-xl">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
    </div>
  );
}
