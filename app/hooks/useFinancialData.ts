'use client';
import { useState, useEffect } from 'react';
import { INITIAL_PROFILE, STORAGE_KEY } from '@/app/lib/logic';

export function useFinancialData() {
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Charger au démarrage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setProfile(parsed.profile || INITIAL_PROFILE);
          setHistory(parsed.history || []);
        } catch (e) {
          console.error('Erreur chargement données', e);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  // Sauvegarder le profil
  const saveProfile = (newProfile: any) => {
    setProfile(newProfile);
    const dataToSave = { profile: newProfile, history };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  };

  // Sauvegarder une décision (historique)
  const saveDecision = (decision: any) => {
    const newHistory = [...history, decision];
    setHistory(newHistory);
    const dataToSave = { profile, history: newHistory };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  };

  return { profile, history, saveProfile, saveDecision, isLoaded };
}
