'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { logger } from '@/app/lib/logger';

/**
 * Remplace uniquement le segment (auth) : la colonne branding AuthLayout reste visible sur desktop.
 */
export default function AuthSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    logger.error('SEGMENT_ERROR_AUTH', { digest: error.digest }, error);
  }, [error]);

  return (
    <div
      className="w-full max-w-sm space-y-6 animate-in fade-in duration-300"
      role="alert"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <ShieldAlert className="h-6 w-6" strokeWidth={2} aria-hidden />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Connexion interrompue</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Une erreur s’est produite sur cette page. Tu peux réessayer ou te rendre à l’accueil.
        </p>
        {process.env.NODE_ENV === 'development' && error.message && (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-left font-mono text-xs text-rose-600 break-words">
            {error.message}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Réessayer
          </button>
          <button
            type="button"
            onClick={() => router.push('/sign-in')}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    </div>
  );
}
