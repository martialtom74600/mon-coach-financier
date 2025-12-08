'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
// Assure-toi que ce chemin pointe bien vers ton fichier definitions.ts créé juste avant
import { INITIAL_PROFILE, Profile } from '@/app/lib/definitions'; 

export function useFinancialData() {
  const { user, isLoaded: isClerkLoaded } = useUser();
  
  // 1. TYPAGE STRICT : On utilise le type Profile, fini le 'any'
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE);
  const [history, setHistory] = useState<any[]>([]); 
  const [isLoadingData, setIsLoadingData] = useState(true);

  // 2. RÉCUPÉRATION DES DONNÉES (BLINDÉE)
  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      // Le timestamp ?t=... force le rafraichissement (pas de cache vieux)
      const res = await fetch(`/api/user?t=${Date.now()}`);
      
      if (res.ok) {
        const data = await res.json();
        
        if (data) {
          const { history: savedHistory, ...savedProfile } = data;

          // --- NETTOYAGE ANTI-CRASH (Vital) ---
          // On force le typage pour s'assurer que l'objet respecte l'interface Profile
          const cleanProfile: Profile = {
              ...INITIAL_PROFILE, // On part des valeurs par défaut saines
              ...savedProfile,    // On écrase avec les données BDD
              
              // Sécurisation des tableaux (Si la BDD renvoie null, on met [])
              incomes: Array.isArray(savedProfile.incomes) ? savedProfile.incomes : [],
              fixedCosts: Array.isArray(savedProfile.fixedCosts) ? savedProfile.fixedCosts : [],
              credits: Array.isArray(savedProfile.credits) ? savedProfile.credits : [],
              subscriptions: Array.isArray(savedProfile.subscriptions) ? savedProfile.subscriptions : [],
              annualExpenses: Array.isArray(savedProfile.annualExpenses) ? savedProfile.annualExpenses : [],
              savingsContributions: Array.isArray(savedProfile.savingsContributions) ? savedProfile.savingsContributions : [],
              goals: Array.isArray(savedProfile.goals) ? savedProfile.goals : [],
              
              // --- MIGRATION INTELLIGENTE ---
              // Gère la transition : Ancien format (nombre) -> Nouveau format (tableau)
              investments: Array.isArray(savedProfile.investments) ? savedProfile.investments : [],
              
              // Si 'investments' était un nombre dans la vieille version, on le déplace vers 'investedAmount'
              investedAmount: typeof savedProfile.investments === 'number' 
                ? savedProfile.investments 
                : (savedProfile.investedAmount || 0),
          };

          setProfile(cleanProfile);
          setHistory(Array.isArray(savedHistory) ? savedHistory : []);
        } else {
           // Nouvel utilisateur : On initialise avec son prénom Clerk
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

  // 3. LA FONCTION DE SAUVEGARDE (TYPÉE)
  // Accepte un "bout" de profil (Partial) pour faire des mises à jour ciblées
  const saveProfile = async (newProfileData: Partial<Profile>) => {
    // 1. Fusion Optimiste : On met à jour l'état local immédiatement
    const updatedProfile = { ...profile, ...newProfileData };
    setProfile(updatedProfile as Profile); 
    
    // 2. Envoi BDD : On sauvegarde tout l'objet pour être sûr
    return await pushToDB({ ...updatedProfile, history });
  };

  // Fonctions pour l'historique des décisions
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
      saveProfile, 
      saveDecision, 
      deleteDecision, 
      isLoaded: isClerkLoaded && !isLoadingData, 
      user,
      refreshData: fetchData 
  };
}