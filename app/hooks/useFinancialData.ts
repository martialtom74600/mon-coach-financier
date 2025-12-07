'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { INITIAL_PROFILE } from '@/app/lib/logic'; 

export function useFinancialData() {
  const { user, isLoaded: isClerkLoaded } = useUser();
  
  const [profile, setProfile] = useState<any>(INITIAL_PROFILE);
  const [history, setHistory] = useState<any[]>([]); 
  const [isLoadingData, setIsLoadingData] = useState(true);

  // 1. RÉCUPÉRATION DES DONNÉES (BLINDÉE)
  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      // Le timestamp ?t=... force le rafraichissement (pas de cache vieux)
      const res = await fetch(`/api/user?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        
        if (data) {
          const { history: savedHistory, ...savedProfile } = data;

          // --- NETTOYAGE ANTI-CRASH ---
          // On s'assure que tout est bien un tableau pour ne jamais planter l'écran
          const cleanProfile = {
             ...INITIAL_PROFILE,
             ...savedProfile,
             incomes: Array.isArray(savedProfile.incomes) ? savedProfile.incomes : [],
             fixedCosts: Array.isArray(savedProfile.fixedCosts) ? savedProfile.fixedCosts : [],
             credits: Array.isArray(savedProfile.credits) ? savedProfile.credits : [],
             subscriptions: Array.isArray(savedProfile.subscriptions) ? savedProfile.subscriptions : [],
             annualExpenses: Array.isArray(savedProfile.annualExpenses) ? savedProfile.annualExpenses : [],
             
             // Migration intelligente (Ancien vs Nouveau format investissement)
             investments: Array.isArray(savedProfile.investments) ? savedProfile.investments : [],
             investedAmount: typeof savedProfile.investments === 'number' 
                ? savedProfile.investments 
                : (savedProfile.investedAmount || 0),
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

  // Chargement au démarrage
  useEffect(() => {
    if (!isClerkLoaded) return;
    if (!user) { setIsLoadingData(false); return; }
    fetchData();
  }, [isClerkLoaded, user, fetchData]);

  // Fonction interne pour parler à la BDD
  const pushToDB = async (dataToSave: any) => {
    if (!user) return;
    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });
      if (!response.ok) throw new Error('Erreur sauvegarde');
      return await response.json();
    } catch (error) { console.error("Erreur save:", error); throw error; }
  };

  // 2. LA FONCTION DE SAUVEGARDE (DIRECTE)
  // Appelle ça sur ton bouton "Enregistrer"
  const saveProfile = async (newProfile: any) => {
    // 1. On met à jour l'état local du hook pour être synchro
    const updatedProfile = { ...profile, ...newProfile };
    setProfile(updatedProfile); 
    
    // 2. On envoie DIRECTEMENT à la BDD (Pas de délai, pas d'auto-save)
    return await pushToDB({ ...updatedProfile, history });
  };

  // Fonctions bonus pour l'historique (si besoin plus tard)
  const saveDecision = async (decision: any) => {
    const newHistory = [...history, decision];
    setHistory(newHistory);
    return await pushToDB({ ...profile, history: newHistory });
  };

  const deleteDecision = async (idToDelete: string) => {
    const newHistory = history.filter((item: any) => item.id !== idToDelete);
    setHistory(newHistory);
    return await pushToDB({ ...profile, history: newHistory });
  };

  return { 
      profile, 
      history, 
      saveProfile,    // <-- C'est elle ta star
      saveDecision, 
      deleteDecision, 
      isLoaded: isClerkLoaded && !isLoadingData, 
      user,
      refreshData: fetchData 
  };
}