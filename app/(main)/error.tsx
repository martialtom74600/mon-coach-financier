'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import GlassCard from '@/app/components/ui/GlassCard';
import { logger } from '@/app/lib/logger';

export default function MainSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    logger.error('SEGMENT_ERROR_MAIN', { digest: error.digest }, error);
  }, [error]);

  return (
    <div
      className="flex min-h-[48vh] items-center justify-center py-6 md:py-10 animate-in fade-in duration-500"
      role="alert"
    >
      <GlassCard className="max-w-lg w-full space-y-5 p-8 text-center shadow-lg shadow-slate-200/50 border-slate-200/80 md:p-10 hover:!translate-y-0 hover:!shadow-lg">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
          <AlertTriangle className="h-8 w-8" strokeWidth={2} aria-hidden />
        </div>
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 md:text-2xl">
            Ce bloc n’a pas pu s’afficher
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Un souci local est survenu ici — le reste de ton espace peut encore fonctionner.
            Tes données ne sont pas perdues. Réessaie ou repars du QG.
          </p>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-left">
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-slate-400">
              Détails techniques
            </summary>
            <pre className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-rose-600">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          </details>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-slate-900 px-7 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-indigo-600 hover:shadow-xl"
          >
            Réessayer
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="rounded-xl bg-slate-100 px-7 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200"
          >
            Retour au QG
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
