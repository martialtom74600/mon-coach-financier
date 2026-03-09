'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('[RouteError]', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="bg-white border border-slate-100 shadow-xl shadow-slate-200/50 rounded-3xl p-10 max-w-lg w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Le moteur a rencontré un problème
          </h2>
          <p className="text-slate-500 mt-3 leading-relaxed">
            Pas de panique — vos données sont intactes. Le calcul a échoué, mais vous pouvez réessayer
            ou revenir au tableau de bord.
          </p>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="text-left bg-slate-50 rounded-xl p-4 border border-slate-100">
            <summary className="text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer">
              Détails techniques
            </summary>
            <pre className="mt-3 text-xs text-rose-600 font-mono whitespace-pre-wrap break-words overflow-auto max-h-40">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-slate-900 hover:bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            Réessayer
          </button>
          <button
            onClick={() => router.push('/')}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-8 py-3.5 rounded-xl font-bold text-sm transition-all"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    </div>
  );
}
