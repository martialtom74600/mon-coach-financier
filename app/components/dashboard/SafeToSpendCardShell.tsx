import type { ReactNode } from 'react';

/** Enveloppe identique à GlassCard + décor du bloc trésorerie (côté serveur pour le LCP). */
export function SafeToSpendCardShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:border-indigo-100 hover:-translate-y-0.5 border-indigo-50/50 shadow-xl shadow-indigo-100/40 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
