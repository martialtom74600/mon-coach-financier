'use client';

import React from 'react';
import { Shield } from 'lucide-react';

interface AppLoadingScreenProps {
  /** Message affiché sous le loader */
  message?: string;
  /** Variante compacte (ex: dans AuthLayout) */
  compact?: boolean;
}

export default function AppLoadingScreen({ message = 'Chargement...', compact = false }: AppLoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      {/* Fond décoratif */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-100/40 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 animate-in fade-in duration-500">
        {/* Logo animé */}
        <div className="relative">
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200/60 animate-pulse">
            <Shield className="text-white" size={40} strokeWidth={2} />
          </div>
          {/* Anneau de chargement autour du logo */}
          <div className="absolute inset-0 -m-2 rounded-3xl border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
        </div>

        {/* Titre */}
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Coach<span className="text-indigo-600">.io</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Mon Coach Financier</p>
        </div>

        {/* Barre de progression animée */}
        {!compact && (
          <div className="w-48 space-y-2">
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-indigo-500 rounded-full animate-pulse" />
            </div>
            <p className="text-xs text-slate-400 text-center font-medium">{message}</p>
          </div>
        )}

        {compact && (
          <p className="text-sm text-slate-500">{message}</p>
        )}
      </div>
    </div>
  );
}
