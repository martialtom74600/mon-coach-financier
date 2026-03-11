'use client';

import { usePathname } from 'next/navigation';
import AuthLayout from './AuthLayout';
import AppLoadingScreen from './AppLoadingScreen';

export default function ClerkLoadingFallback() {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up');

  // Sur les pages auth : branding + loader dans le layout AuthLayout
  if (isAuthRoute) {
    return (
      <AuthLayout>
        <AppLoadingScreen message="Préparation de ta session..." compact />
      </AuthLayout>
    );
  }

  // Autres pages : écran de chargement complet
  return <AppLoadingScreen message="Chargement de l'application..." />;
}
