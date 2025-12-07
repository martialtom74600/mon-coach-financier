'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { INITIAL_PROFILE } from '@/app/lib/logic'; 

export function useFinancialData() {
  const { user, isLoaded: isClerkLoaded } = useUser();
  
  const [profile, setProfile] = useState<any>(INITIAL_PROFILE);
  const [history, setHistory] = useState<any[]>([]); 
  const [isLoadingData, setIsLoadingData] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/user?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        
        if (data) {
          const { history: savedHistory, ...savedProfile } = data;

          // --- SANITIZATION : On force les tableaux à être des tableaux ---
          // Cela évite les crashs si la BDD renvoie null pour une liste
          const cleanProfile = {
             ...INITIAL_PROFILE, // Valeurs par défaut
             ...savedProfile,    // Valeurs de la BDD
             // Sécurité pour les listes :
             incomes: savedProfile.incomes || [],
             fixedCosts: savedProfile.fixedCosts || [],
             credits: savedProfile.credits || [],
             subscriptions: savedProfile.subscriptions || [],
             // On prépare le terrain pour la suite :
             investments: savedProfile.investments || [],
          };

          setProfile(cleanProfile);
          setHistory(Array.isArray(savedHistory) ? savedHistory : []);
        } else {
           // Nouvel utilisateur
           setProfile({ ...INITIAL_PROFILE, firstName: user.firstName || '' });
        }
      }
    } catch (error) {
      console.error("Erreur sync:", error);
    } finally {
      setIsLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isClerkLoaded) return;
    if (!user) { setIsLoadingData(false); return; }
    fetchData();
  }, [isClerkLoaded, user, fetchData]);

  const pushToDB = async (dataToSave: any) => {
    if (!user) return;
    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });
      if (!response.ok) throw new Error('Erreur API');
      return await response.json(); 
    } catch (error) { console.error("Erreur save:", error); throw error; }
  };

  const saveProfile = async (newProfile: any, forceImmediate = false) => {
    // Optimistic UI Update : On met à jour l'écran tout de suite
    const updatedProfile = { ...profile, ...newProfile };
    setProfile(updatedProfile); 
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    if (forceImmediate) {
      return await pushToDB({ ...updatedProfile, history });
    } else {
      // Debounce : on attend 1 seconde que l'utilisateur finisse de taper
      saveTimeoutRef.current = setTimeout(() => { pushToDB({ ...updatedProfile, history }); }, 1000); 
      return Promise.resolve();
    }
  };

  const saveDecision = async (decision: any) => {
    const newHistory = [...history, decision];
    setHistory(newHistory);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    return await pushToDB({ ...profile, history: newHistory });
  };

  const deleteDecision = async (idToDelete: string) => {
    const newHistory = history.filter((item: any) => item.id !== idToDelete);
    setHistory(newHistory);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    return await pushToDB({ ...profile, history: newHistory });
  };

  return { 
      profile, 
      history, 
      saveProfile, 
      saveDecision, 
      deleteDecision, 
      isLoaded: isClerkLoaded && !isLoadingData, 
      user,
      // Petit utilitaire bonus pour recharger manuellement si besoin
      refreshData: fetchData 
  };
}