'use client';

import { useAuth } from '@clerk/nextjs';
import AppLoadingScreen from '@/app/components/AppLoadingScreen';

/**
 * Si le serveur a déjà vu une session Clerk (`auth().userId`), on affiche l’arbre tout de suite :
 * évite un écran plein écran jusqu’à l’hydratation Clerk, ce qui retardait fortement le LCP (contenu masqué).
 * Sign-in / sign-up : pas de session → on attend `isLoaded` comme avant.
 */
export default function ClientShell({
  children,
  trustServerSession = false,
}: {
  children: React.ReactNode;
  /** Aligné sur `auth().userId` dans le layout. */
  trustServerSession?: boolean;
}) {
  const { isLoaded } = useAuth();

  if (trustServerSession) {
    return <>{children}</>;
  }

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
