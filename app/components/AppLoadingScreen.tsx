'use client';

import React from 'react';
import { Shield } from 'lucide-react';

interface AppLoadingScreenProps {
  message?: string;
  compact?: boolean;
  /**
   * 0–100 : barre proportionnelle au téléchargement / étapes réelles.
   * null : navigation Next.js ou durée inconnue → barre indéterminée.
   */
  progress?: number | null;
  /** Au-dessus de la nav (overlay pendant chargement des données) */
  fixed?: boolean;
}

export default function AppLoadingScreen({
  message = 'Chargement...',
  compact = false,
  progress = null,
  fixed = false,
}: AppLoadingScreenProps) {
  const determinate = typeof progress === 'number';
  const pct = determinate ? Math.max(0, Math.min(100, Math.round(progress))) : null;

  const shellClass = fixed
    ? 'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50'
    : 'flex flex-col items-center justify-center min-h-screen bg-slate-50';

  return (
    <div className={shellClass}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-100/40 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 animate-in fade-in duration-500">
        <div className="relative">
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200/60 animate-pulse">
            <Shield className="text-white" size={40} strokeWidth={2} />
          </div>
          <div className="absolute inset-0 -m-2 rounded-3xl border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Coach<span className="text-indigo-600">.io</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Mon Coach Financier</p>
        </div>

        {!compact && (
          <div className="w-48 space-y-2">
            <div
              className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden"
              role="progressbar"
              aria-busy={true}
              aria-valuetext={determinate ? `${pct}% — ${message}` : message}
              {...(determinate
                ? { 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct! }
                : {})}
            >
              {determinate ? (
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 shadow-sm transition-[width] duration-200 ease-out"
                  style={{ width: `${pct}%` }}
                />
              ) : (
                <div className="h-full w-[38%] rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 shadow-sm animate-load-bar will-change-transform" />
              )}
            </div>
            <p className="text-xs text-slate-400 text-center font-medium">
              {determinate ? (
                <>
                  <span className="tabular-nums font-semibold text-indigo-600">{pct}%</span>
                  <span className="text-slate-400"> · </span>
                </>
              ) : null}
              {message}
            </p>
          </div>
        )}

        {compact && (
          <p className="text-sm text-slate-500">
            {determinate ? (
              <>
                <span className="tabular-nums font-semibold text-indigo-600">{pct}%</span>
                {' · '}
              </>
            ) : null}
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
