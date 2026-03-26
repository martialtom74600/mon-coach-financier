'use client';

import { useAuth } from '@clerk/nextjs';
import AppLoadingScreen from '@/app/components/AppLoadingScreen';

/**
 * Remplace ClerkLoading : même contrat (rien tant que la session Clerk n’est pas hydratée).
 * Pourcentage réel : 0 % tant qu’on n’a pas d’étape mesurable côté Clerk (une seule phase binaire).
 */
export default function ClientShell({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <AppLoadingScreen
        progress={0}
        message="Connexion à ton espace sécurisé…"
        fixed
      />
    );
  }

  return <>{children}</>;
}
