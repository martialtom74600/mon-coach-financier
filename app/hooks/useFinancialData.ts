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
    // console.log("💾 Sauvegarde vers Postgres...", dataToSave); 
    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });
      if (!response.ok) throw new Error('Erreur API');
      return await response.json(); 
    } catch (error) {
      console.error("Erreur de sauvegarde:", error);
      throw error; 
    }
  };

  // 2. SAUVEGARDER LE PROFIL (INTELLIGENT)
  const saveProfile = async (newProfile: any, forceImmediate = false) => {
    const updatedProfile = { ...profile, ...newProfile };
    setProfile(updatedProfile); 

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (forceImmediate) {
      return await pushToDB({ ...updatedProfile, history });
    } else {
      saveTimeoutRef.current = setTimeout(() => {
        pushToDB({ ...updatedProfile, history });
      }, 1000);
      return Promise.resolve();
    }
  };

  // 3. SAUVEGARDER UNE DÉCISION (AJOUT)
  const saveDecision = async (decision: any) => {
    const newHistory = [...history, decision];
    setHistory(newHistory);
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    return await pushToDB({ ...profile, history: newHistory });
  };

  // 4. SUPPRIMER UNE DÉCISION (NOUVEAU)
  const deleteDecision = async (idToDelete: string) => {
    // A. On met à jour l'interface tout de suite (Optimistic UI)
    const newHistory = history.filter((item: any) => item.id !== idToDelete);
    setHistory(newHistory);

    // B. On annule tout timer en cours pour éviter les conflits
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
    }

    // C. On sauvegarde la nouvelle liste nettoyée en base
    return await pushToDB({ ...profile, history: newHistory });
  };

  return {
    profile,
    history,
    saveProfile,
    saveDecision,
    deleteDecision, // <--- On exporte la nouvelle fonction
    isLoaded: isClerkLoaded && !isLoadingData,
    user
  };
}