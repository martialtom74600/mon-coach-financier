'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';

// On définit la structure par défaut pour éviter les bugs d'affichage
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
  
  // États locaux pour l'affichage immédiat (Optimistic UI)
  const [profile, setProfile] = useState<any>(DEFAULT_PROFILE);
  const [history, setHistory] = useState<any[]>([]); 
  const [isLoadingData, setIsLoadingData] = useState(true);

  // REF pour le Debounce (C'est le minuteur invisible)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. CHARGEMENT DES DONNÉES (Depuis la Base de Données)
  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/user');
      if (res.ok) {
        const data = await res.json();
        
        if (data) {
          // On sépare l'historique du reste du profil
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

  // On lance le chargement dès que Clerk est prêt
  useEffect(() => {
    if (!isClerkLoaded) return;
    if (!user) {
      setIsLoadingData(false); // Pas connecté
      return;
    }
    fetchData();
  }, [isClerkLoaded, user, fetchData]);

  // FONCTION INTERNE POUR ENVOYER À L'API
  const pushToDB = async (dataToSave: any) => {
    if (!user) return;
    console.log("💾 Sauvegarde en cours vers Postgres..."); 
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

  // 2. SAUVEGARDER LE PROFIL (AVEC TEMPORISATION)
  // C'est ici que la magie opère : on attend 1 seconde avant d'envoyer
  const saveProfile = (newProfile: any) => {
    // A. Mise à jour VISUELLE immédiate (Zéro latence pour l'utilisateur)
    const updatedProfile = { ...profile, ...newProfile };
    setProfile(updatedProfile); 

    // B. Gestion du Timer (Debounce)
    // Si une sauvegarde était déjà prévue, on l'annule (car l'utilisateur tape encore)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // On lance un nouveau compte à rebours de 1 seconde (1000ms)
    saveTimeoutRef.current = setTimeout(() => {
      // Si l'utilisateur n'a rien touché pendant 1s, on envoie à la BDD
      pushToDB({ ...updatedProfile, history });
    }, 1000);
  };

  // 3. SAUVEGARDER UNE DÉCISION (DIRECT)
  // Pour l'historique (clic bouton), pas besoin d'attendre, on sauvegarde direct.
  const saveDecision = (decision: any) => {
    const newHistory = [...history, decision];
    setHistory(newHistory);
    
    // On annule tout timer en cours pour être sûr d'avoir la dernière version
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
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