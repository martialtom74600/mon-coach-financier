'use client';

import { usePathname } from 'next/navigation';
import AuthLayout from './AuthLayout';

export default function ClerkLoadingFallback() {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up');

  // Sur les pages auth : afficher le branding immédiatement, pas un écran vide
  if (isAuthRoute) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent" />
          <p className="text-slate-500 text-sm">Chargement...</p>
        </div>
      </AuthLayout>
    );
  }

  // Autres pages : spinner centré classique
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
    </div>
  );
}
