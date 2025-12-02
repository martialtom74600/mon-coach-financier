'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
// 👇 IMPORT CRUCIAL : On utilise la source de vérité unique
import { INITIAL_PROFILE } from '@/app/lib/constants'; 

export function useFinancialData() {
  const { user, isLoaded: isClerkLoaded } = useUser();
  
  // États locaux
  // On initialise avec INITIAL_PROFILE pour garantir que les tableaux (goals, etc.) existent
  const [profile, setProfile] = useState<any>(INITIAL_PROFILE);
  const [history, setHistory] = useState<any[]>([]); 
  const [isLoadingData, setIsLoadingData] = useState(true);

  // REF pour le Debounce (Anti-spam sauvegarde)
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
          // On sépare l'historique du reste du profil
          const { history: savedHistory, ...savedProfile } = data;
          
          // FUSION INTELLIGENTE :
          // On prend la structure vide complète (INITIAL_PROFILE)
          // Et on écrase avec ce qui vient de la BDD (savedProfile)
          // Ça évite les bugs si on a ajouté un nouveau champ (ex: goals) récemment
          setProfile({ ...INITIAL_PROFILE, ...savedProfile });
          
          setHistory(Array.isArray(savedHistory) ? savedHistory : []);
        } else {
           // Nouvel utilisateur : On met juste son prénom dans la coquille vide
           setProfile({ ...INITIAL_PROFILE, firstName: user.firstName || '' });
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
      }, 1000); // Debounce de 1s
      return Promise.resolve();
    }
  };

  // 3. SAUVEGARDER UNE DÉCISION
  const saveDecision = async (decision: any) => {
    const newHistory = [...history, decision];
    setHistory(newHistory);
    
    // Si une sauvegarde de profil était en attente, on l'annule pour tout envoyer d'un coup
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    return await pushToDB({ ...profile, history: newHistory });
  };

  // 4. SUPPRIMER UNE DÉCISION
  const deleteDecision = async (idToDelete: string) => {
    const newHistory = history.filter((item: any) => item.id !== idToDelete);
    setHistory(newHistory);

    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
    }

    return await pushToDB({ ...profile, history: newHistory });
  };

  return {
    profile,
    history,
    saveProfile,
    saveDecision,
    deleteDecision,
    isLoaded: isClerkLoaded && !isLoadingData,
    user
  };
}