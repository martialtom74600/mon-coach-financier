'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

// On définit la structure par défaut pour éviter les crashs
const DEFAULT_PROFILE = {
  firstName: '',
  monthlyIncome: 0,
  mandatoryExpenses: 0,
  discretionaryExpenses: 0,
  investments: 0,
  matelas: 0,
  goal: 'security',
  mode: 'beginner',
};

export function useFinancialData() {
  const { user, isLoaded: isClerkLoaded } = useUser();
  
  // États locaux (Interface Optimiste)
  const [profile, setProfile] = useState<any>(DEFAULT_PROFILE);
  const [history, setHistory] = useState<any[]>([]); // On ajoute l'historique ici
  const [isLoadingData, setIsLoadingData] = useState(true);

  // 1. CHARGEMENT DES DONNÉES (Depuis l'API / BDD)
  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/user');
      if (res.ok) {
        const data = await res.json();
        
        if (data) {
          // On sépare l'historique du reste du profil s'il est présent dans le JSON
          const { history: savedHistory, ...savedProfile } = data;
          
          setProfile({ ...DEFAULT_PROFILE, ...savedProfile });
          setHistory(Array.isArray(savedHistory) ? savedHistory : []);
        } else {
           // Nouvel utilisateur : on pré-remplit juste le prénom
           setProfile({ ...DEFAULT_PROFILE, firstName: user.firstName || '' });
        }
      }
    } catch (error) {
      console.error("Erreur de synchronisation:", error);
    } finally {
      setIsLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isClerkLoaded) return;
    if (!user) {
      setIsLoadingData(false); // Pas connecté
      return;
    }
    fetchData();
  }, [isClerkLoaded, user, fetchData]);

  // FONCTION INTERNE POUR SAUVEGARDER GLOBALEMENT
  const pushToDB = async (dataToSave: any) => {
    if (!user) return;
    try {
      await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });
    } catch (error) {
      console.error("Erreur de sauvegarde:", error);
    }
  };

  // 2. SAUVEGARDER LE PROFIL
  const saveProfile = (newProfile: any) => {
    const updatedProfile = { ...profile, ...newProfile };
    setProfile(updatedProfile); // Mise à jour visuelle immédiate
    
    // On envoie tout (Profil + Historique actuel)
    pushToDB({ ...updatedProfile, history });
  };

  // 3. SAUVEGARDER UNE DÉCISION (HISTORIQUE)
  const saveDecision = (decision: any) => {
    const newHistory = [...history, decision];
    setHistory(newHistory); // Mise à jour visuelle immédiate
    
    // On envoie tout (Profil actuel + Nouvel Historique)
    pushToDB({ ...profile, history: newHistory });
  };

  return {
    profile,
    history,
    saveProfile,
    saveDecision,
    isLoaded: isClerkLoaded && !isLoadingData,
    user
  };
}