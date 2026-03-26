'use client';

import { useEffect, useState } from 'react';
import AppLoadingScreen from '@/app/components/AppLoadingScreen';
import { useFinancialData } from '@/app/hooks/useFinancialData';

/**
 * Plein écran uniquement au premier chargement du profil après connexion.
 * Les refreshData() ultérieurs ne bloquent pas toute l’UI (PageLoader local si besoin).
 */
export default function AppLoadingOverlay() {
  const { user, isLoading, loadProgress } = useFinancialData();
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    if (!user) setInitialLoadDone(false);
  }, [user]);

  useEffect(() => {
    if (user && !isLoading) setInitialLoadDone(true);
  }, [user, isLoading]);

  if (!user) return null;
  if (initialLoadDone) return null;

  return (
    <AppLoadingScreen
      progress={loadProgress}
      message="Chargement de tes données financières…"
      fixed
    />
  );
}
