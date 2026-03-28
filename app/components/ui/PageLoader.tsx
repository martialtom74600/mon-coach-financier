'use client';

import React from 'react';

export interface PageLoaderProps {
  className?: string;
  /** `page` = zone principale ; `compact` = liste ou encart */
  variant?: 'page' | 'compact';
}

/**
 * Squelette discret : garde la structure de la page visible (pas d’écran vide / point unique).
 */
export default function PageLoader({ className = '', variant = 'page' }: PageLoaderProps) {
  const compact = variant === 'compact';
  return (
    <div
      className={`w-full ${compact ? 'space-y-3 py-2' : 'min-h-[38vh] space-y-4 py-4'} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label="Chargement du contenu"
    >
      <div
        className={`rounded-lg bg-slate-200/70 animate-pulse ${compact ? 'h-6 w-40' : 'h-8 w-52'}`}
      />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`rounded-xl bg-slate-100 animate-pulse ${compact ? 'h-16' : 'h-24'}`}
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
