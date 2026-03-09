'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { INITIAL_PROFILE, Profile, FinancialItem, Asset, Goal, HousingStatus } from '@/app/lib/definitions';
import {
  profileAPIResponseSchema,
  financialItemResponseSchema,
  assetResponseSchema,
  financialGoalResponseSchema,
  purchaseDecisionResponseSchema,
  profilePatchResponseSchema,
  successResponseSchema,
  parseAPIResponse,
} from '@/app/lib/validations';

interface DecisionInput {
  name: string;
  amount: number;
  date?: Date | string;
  type?: string;
  paymentMode: string;
  isPro?: boolean;
  isReimbursable?: boolean;
  reimbursedAt?: Date | string | null;
  duration?: number | null;
  rate?: number | null;
}

export function useFinancialData() {
  const { user, isLoaded: isClerkLoaded } = useUser();
  
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ==========================================================================
  // 1. CHARGEMENT INITIAL (GET global) — Protégé par le Bouclier Zod
  // ==========================================================================
  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoadingData(true);
    setError(null);

    try {
      const res = await fetch('/api/user');
      
      if (res.ok) {
        const raw = await res.json();
        if (raw) {
            const validated = parseAPIResponse(
              profileAPIResponseSchema, raw, 'GET /api/user',
            );

            if (!validated) {
              setError("Données incohérentes reçues du serveur.");
              return;
            }

            // API retourne des dates en string (JSON) ; le moteur gère les deux via new Date()
            const cleanProfile = {
                ...INITIAL_PROFILE,
                ...validated,
                household: { ...INITIAL_PROFILE.household, ...(validated.household || {}) },
                housing: {
                    status: validated.housing?.status ?? HousingStatus.TENANT,
                    monthlyCost: validated.housing?.monthlyCost ?? 0,
                    paymentDay: validated.housing?.paymentDay ?? undefined,
                },
                assets: validated.assets || [],
                goals: validated.goals || [],
                decisions: validated.decisions || [],
                incomes: validated.incomes || [],
                fixedCosts: validated.fixedCosts || [],
                variableCosts: validated.variableCosts || [],
                credits: validated.credits || [],
                subscriptions: validated.subscriptions || [],
                annualExpenses: validated.annualExpenses || [],
            } as unknown as Profile;
            setProfile(cleanProfile);
        } else {
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
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const raw = await res.json();
        if (!parseAPIResponse(profilePatchResponseSchema, raw, 'PATCH /api/profile')) {
          setError("Données incohérentes reçues du serveur.");
        }
      }
    } catch (err) {
      console.error("Erreur save profile:", err);
      fetchData();
    }
  };

  // 🔹 Ajouter un Item (Revenu/Dépense)
  const addItem = async (item: Partial<FinancialItem>) => {
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        const raw = await res.json();
        const newItem = parseAPIResponse(
          financialItemResponseSchema, raw, 'POST /api/items',
        );
        if (!newItem) {
          setError("Données incohérentes reçues du serveur.");
        }
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
        incomes: prev.incomes.filter(i => i.id !== itemId),
        fixedCosts: prev.fixedCosts.filter(i => i.id !== itemId),
        variableCosts: prev.variableCosts.filter(i => i.id !== itemId),
        credits: prev.credits.filter(i => i.id !== itemId),
        subscriptions: prev.subscriptions.filter(i => i.id !== itemId),
        annualExpenses: prev.annualExpenses.filter(i => i.id !== itemId),
    }));

    try {
      const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        const raw = await res.json();
        if (!parseAPIResponse(successResponseSchema, raw, 'DELETE /api/items/:id')) {
          setError("Données incohérentes reçues du serveur.");
        }
      } else {
        fetchData();
      }
    } catch (err) { console.error(err); fetchData(); }
  };

  // 🔹 Ajouter/Modifier un Asset (Patrimoine)
  const saveAsset = async (asset: Partial<Asset>) => {
    const method = asset.id ? 'PATCH' : 'POST';
    const url = asset.id ? `/api/assets/${asset.id}` : '/api/assets';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asset),
      });
      if (res.ok) {
        const raw = await res.json();
        if (!parseAPIResponse(assetResponseSchema, raw, `${method} /api/assets`)) {
          setError("Données incohérentes reçues du serveur.");
        }
      }
      fetchData();
    } catch (err) { console.error(err); }
  };

  const deleteAsset = async (assetId: string) => {
    try {
      const res = await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
      if (res.ok) {
        const raw = await res.json();
        if (!parseAPIResponse(successResponseSchema, raw, 'DELETE /api/assets/:id')) {
          setError("Données incohérentes reçues du serveur.");
        }
      }
      fetchData();
    } catch (err) { console.error(err); }
  };

  // 🔹 Gérer les Objectifs (Goals)
  const saveGoal = async (goal: Partial<Goal>) => {
    const method = goal.id ? 'PATCH' : 'POST';
    const url = goal.id ? `/api/goals/${goal.id}` : '/api/goals';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goal),
      });
      if (res.ok) {
        const raw = await res.json();
        if (!parseAPIResponse(financialGoalResponseSchema, raw, `${method} /api/goals`)) {
          setError("Données incohérentes reçues du serveur.");
        }
      }
      fetchData();
    } catch (err) { console.error(err); }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      const res = await fetch(`/api/goals/${goalId}`, { method: 'DELETE' });
      if (res.ok) {
        const raw = await res.json();
        if (!parseAPIResponse(successResponseSchema, raw, 'DELETE /api/goals/:id')) {
          setError("Données incohérentes reçues du serveur.");
        }
      }
      fetchData();
    } catch (err) { console.error(err); }
  };

  // 🔹 Gérer les Décisions d'achat
  const addDecision = async (decision: DecisionInput) => {
    try {
      const res = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decision),
      });
      if (res.ok) {
        const raw = await res.json();
        if (!parseAPIResponse(purchaseDecisionResponseSchema, raw, 'POST /api/decisions')) {
          setError("Données incohérentes reçues du serveur.");
        }
      }
      fetchData();
    } catch (err) { console.error(err); }
  };

  const deleteDecision = async (id: string) => {
    try {
      const res = await fetch(`/api/decisions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const raw = await res.json();
        if (!parseAPIResponse(successResponseSchema, raw, 'DELETE /api/decisions/:id')) {
          setError("Données incohérentes reçues du serveur.");
        }
      }
      fetchData();
    } catch (err) { console.error(err); }
  };

  const updateDecisionOutcome = async (id: string, outcome: 'SATISFIED' | 'REGRETTED' | null) => {
    const previous = profile.decisions?.find((d) => d.id === id);
    setProfile((prev) => ({
      ...prev,
      decisions: (prev.decisions || []).map((d) =>
        d.id === id ? { ...d, outcome } : d
      ),
    }));
    try {
      const res = await fetch(`/api/decisions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome }),
      });
      if (res.ok) {
        const raw = await res.json();
        if (!parseAPIResponse(purchaseDecisionResponseSchema, raw, 'PATCH /api/decisions/:id')) {
          setError("Données incohérentes reçues du serveur.");
          fetchData();
        }
      } else {
        setProfile((prev) => ({
          ...prev,
          decisions: (prev.decisions || []).map((d) =>
            d.id === id && previous ? { ...d, outcome: previous.outcome ?? null } : d
          ),
        }));
      }
    } catch (err) {
      console.error(err);
      setProfile((prev) => ({
        ...prev,
        decisions: (prev.decisions || []).map((d) =>
          d.id === id && previous ? { ...d, outcome: previous.outcome ?? null } : d
        ),
      }));
    }
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
      deleteDecision,
      updateDecisionOutcome
  };
}