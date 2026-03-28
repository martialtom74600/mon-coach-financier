'use client';

import AppLoadingScreen from '@/app/components/AppLoadingScreen';
import { useFinancialData } from '@/app/hooks/useFinancialData';

/**
 * S’affiche seulement quand un chargement **réel** est en cours (`isLoading`).
 * Avec `serverPreload`, pas d’écran bloquant au premier paint (évite de retarder le LCP).
 */
export default function AppLoadingOverlay() {
  const { user, isLoading, loadProgress } = useFinancialData();

  if (!user) return null;
  if (!isLoading) return null;

  return (
    <AppLoadingScreen
      progress={loadProgress}
      message="Chargement de tes données financières…"
      fixed
    />
  );
}
