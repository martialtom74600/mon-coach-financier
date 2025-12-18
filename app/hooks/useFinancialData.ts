'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { INITIAL_PROFILE, Profile, FinancialItem, Asset, Goal, PurchaseDecision } from '@/app/lib/definitions'; 

export function useFinancialData() {
  const { user, isLoaded: isClerkLoaded } = useUser();
  
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ==========================================================================
  // 1. CHARGEMENT INITIAL (GET global)
  // ==========================================================================
  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoadingData(true);
    setError(null);

    try {
      // On récupère tout le dashboard d'un coup
      const res = await fetch(`/api/user?t=${Date.now()}`);
      
      if (res.ok) {
        const data = await res.json();
        if (data) {
            // Nettoyage et fusion avec les valeurs par défaut
            const cleanProfile: Profile = {
                ...INITIAL_PROFILE,
                ...data, // Les données de l'API écrasent les defaults
                
                // Sécurisation des objets imbriqués
                household: { ...INITIAL_PROFILE.household, ...(data.household || {}) },
                housing: { ...INITIAL_PROFILE.housing, ...(data.housing || {}) },
                
                // Sécurisation des tableaux (API renvoie [] si vide, mais on assure le coup)
                items: data.items || [], // Items bruts
                assets: data.assets || [],
                goals: data.goals || [],
                decisions: data.decisions || [],

                // Listes filtrées (déjà préparées par l'API normalement, sinon fallback)
                incomes: data.incomes || [],
                fixedCosts: data.fixedCosts || [],
                variableCosts: data.variableCosts || [],
                credits: data.credits || [],
                subscriptions: data.subscriptions || [],
                annualExpenses: data.annualExpenses || [],
            };
            setProfile(cleanProfile);
        } else {
            // Nouvel utilisateur
            setProfile({ ...INITIAL_PROFILE, firstName: user.firstName || '' });
        }
      } else {
          console.error("Erreur HTTP", res.status);
          setError("Impossible de charger les données.");
      }
    } catch (err) {
      console.error("Erreur fetch:", err);
      setError("Erreur de connexion.");
    } finally {
      setIsLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (isClerkLoaded && user) fetchData();
    else if (isClerkLoaded && !user) setIsLoadingData(false);
  }, [isClerkLoaded, user, fetchData]);


  // ==========================================================================
  // 2. ACTIONS UNITAIRES (CRUD) - LE COEUR DU SYSTÈME
  // ==========================================================================

  // 🔹 Mettre à jour le Profil (Age, Statut, Budget Fun...)
  const updateProfileInfo = async (updates: Partial<Profile>) => {
    // 1. Optimistic UI : On met à jour l'écran tout de suite
    setProfile(prev => ({ ...prev, ...updates }));

    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error("Erreur save profile:", err);
      // En cas d'erreur, on pourrait rollback ici (fetchData())
      fetchData(); 
    }
  };

  // 🔹 Ajouter un Item (Revenu/Dépense)
  const addItem = async (item: Partial<FinancialItem>) => {
    // Optimistic (Optionnel, ici on attend le retour pour avoir l'ID)
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (res.ok) {
          const newItem = await res.json();
          // On recharge tout pour être sûr que les calculs et tris sont bons
          // (Ou on ajoute manuellement à la bonne liste si on veut être ultra-performant)
          fetchData(); 
          return newItem;
      }
    } catch (err) { console.error(err); }
  };

  // 🔹 Supprimer un Item
  const deleteItem = async (itemId: string) => {
    // Optimistic UI : On le retire visuellement tout de suite
    setProfile(prev => ({
        ...prev,
        // On filtre toutes les listes potentielles (bourrin mais efficace visuellement)
        incomes: prev.incomes.filter(i => i.id !== itemId),
        fixedCosts: prev.fixedCosts.filter(i => i.id !== itemId),
        variableCosts: prev.variableCosts.filter(i => i.id !== itemId),
        credits: prev.credits.filter(i => i.id !== itemId),
        subscriptions: prev.subscriptions.filter(i => i.id !== itemId),
        annualExpenses: prev.annualExpenses.filter(i => i.id !== itemId),
    }));

    try {
        await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
    } catch (err) { console.error(err); fetchData(); }
  };

  // 🔹 Ajouter/Modifier un Asset (Patrimoine)
  const saveAsset = async (asset: Partial<Asset>) => {
      const method = asset.id ? 'PATCH' : 'POST';
      const url = asset.id ? `/api/assets/${asset.id}` : '/api/assets';

      try {
          await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(asset),
          });
          fetchData(); // On recharge pour mettre à jour les graphiques
      } catch (err) { console.error(err); }
  };

  const deleteAsset = async (assetId: string) => {
      try {
          await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
          fetchData();
      } catch (err) { console.error(err); }
  };

  // 🔹 Gérer les Objectifs (Goals)
  const saveGoal = async (goal: Partial<Goal>) => {
      const method = goal.id ? 'PATCH' : 'POST';
      const url = goal.id ? `/api/goals/${goal.id}` : '/api/goals';

      try {
          await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(goal),
          });
          fetchData();
      } catch (err) { console.error(err); }
  };

  const deleteGoal = async (goalId: string) => {
    try {
        await fetch(`/api/goals/${goalId}`, { method: 'DELETE' });
        fetchData();
    } catch (err) { console.error(err); }
  };

  // 🔹 Gérer les Décisions d'achat
  const addDecision = async (decision: any) => {
      try {
          await fetch('/api/decisions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(decision),
          });
          fetchData();
      } catch (err) { console.error(err); }
  };

  const deleteDecision = async (id: string) => {
    try {
        await fetch(`/api/decisions/${id}`, { method: 'DELETE' });
        fetchData();
    } catch (err) { console.error(err); }
  };

  return { 
      // Données
      profile, 
      isLoaded: isClerkLoaded && !isLoadingData,
      isLoading: isLoadingData,
      error,
      user,

      // Actions "Atomiques"
      refreshData: fetchData,
      updateProfileInfo,
      
      addItem,
      deleteItem,
      
      saveAsset,
      deleteAsset,
      
      saveGoal,
      deleteGoal,
      
      addDecision,
      deleteDecision
  };
}