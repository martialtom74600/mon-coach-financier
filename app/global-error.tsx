'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex items-center justify-center p-6">
        <div className="bg-white border border-slate-100 shadow-xl rounded-3xl p-10 max-w-lg w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Oups, quelque chose a planté
            </h1>
            <p className="text-slate-500 mt-2 leading-relaxed">
              Une erreur inattendue s'est produite. Vos données sont en sécurité — rien n'a été perdu.
            </p>
          </div>
          {error.digest && (
            <p className="text-xs text-slate-400 font-mono bg-slate-50 px-3 py-2 rounded-lg">
              Réf\u00a0: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="bg-slate-900 hover:bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
