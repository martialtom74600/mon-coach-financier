'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';

// Structure par défaut
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
  
  // États locaux
  const [profile, setProfile] = useState<any>(DEFAULT_PROFILE);
  const [history, setHistory] = useState<any[]>([]); 
  const [isLoadingData, setIsLoadingData] = useState(true);

  // REF pour le Debounce
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. CHARGEMENT DES DONNÉES
  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      // Ajout d'un timestamp pour éviter le cache navigateur sur le GET
      const res = await fetch(`/api/user?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        
        if (data) {
          const { history: savedHistory, ...savedProfile } = data;
          setProfile({ ...DEFAULT_PROFILE, ...savedProfile });
          setHistory(Array.isArray(savedHistory) ? savedHistory : []);
        } else {
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
      setIsLoadingData(false);
      return;
    }
    fetchData();
  }, [isClerkLoaded, user, fetchData]);

  // FONCTION INTERNE POUR ENVOYER À L'API
  const pushToDB = async (dataToSave: any) => {
    if (!user) return;
    console.log("💾 Sauvegarde IMMÉDIATE vers Postgres...", dataToSave); 
    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });
      if (!response.ok) throw new Error('Erreur API');
      return await response.json(); // On retourne la réponse pour pouvoir l'attendre
    } catch (error) {
      console.error("Erreur de sauvegarde:", error);
      throw error; // On remonte l'erreur pour que le bouton le sache
    }
  };

  // 2. SAUVEGARDER LE PROFIL (INTELLIGENT)
  // forceImmediate = true permet de contourner le délai (pour le bouton "Sauvegarder")
  const saveProfile = async (newProfile: any, forceImmediate = false) => {
    // Mise à jour visuelle locale
    const updatedProfile = { ...profile, ...newProfile };
    setProfile(updatedProfile); 

    // Annulation du timer précédent s'il y en a un
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (forceImmediate) {
      // CAS 1 : Clic sur "Sauvegarder et Quitter" -> On envoie tout de suite et on attend la réponse
      return await pushToDB({ ...updatedProfile, history });
    } else {
      // CAS 2 : Frappe au clavier -> On attend 1s pour ne pas spammer
      saveTimeoutRef.current = setTimeout(() => {
        pushToDB({ ...updatedProfile, history });
      }, 1000);
      // On retourne une promesse vide immédiate pour ne pas bloquer l'UI
      return Promise.resolve();
    }
  };

  // 3. SAUVEGARDER UNE DÉCISION (Historique)
  const saveDecision = async (decision: any) => {
    const newHistory = [...history, decision];
    setHistory(newHistory);
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    return await pushToDB({ ...profile, history: newHistory });
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