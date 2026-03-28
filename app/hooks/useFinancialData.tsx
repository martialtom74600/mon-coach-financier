'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useUser } from '@clerk/nextjs';
import { INITIAL_PROFILE, Profile, FinancialItem, Asset, Goal } from '@/app/lib/definitions';
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
import { getJsonWithProgress } from '@/app/lib/getJsonWithProgress';
import { profileFromApiPayload } from '@/app/lib/profileFromApiPayload';

/** Profil déjà résolu côté serveur (layout) pour éviter le 2ᵉ aller-retour réseau au premier rendu. */
export type FinancialServerPreload = {
  userId: string;
  profile: Profile;
} | null;

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

function useFinancialDataState(serverPreload: FinancialServerPreload) {
  const { user, isLoaded: isClerkLoaded } = useUser();

  /** Si le layout a déjà résolu le profil, ne pas attendre un cycle React pour masquer l’overlay (LCP). */
  const [profile, setProfile] = useState<Profile>(
    () => serverPreload?.profile ?? INITIAL_PROFILE
  );
  const [isLoadingData, setIsLoadingData] = useState(() => serverPreload == null);
  const [loadProgress, setLoadProgress] = useState(() => (serverPreload ? 100 : 0));
  const [error, setError] = useState<string | null>(null);
  const syncedUserRef = useRef<string | null>(null);

  const fetchData = useCallback(async (opts?: { background?: boolean }) => {
    if (!user) return;
    const background = opts?.background ?? false;
    if (!background) {
      setIsLoadingData(true);
      setLoadProgress(40);
    }
    setError(null);

    try {
      let ok: boolean;
      let status: number;
      let raw: unknown;

      if (background) {
        const res = await fetch('/api/user');
        status = res.status;
        ok = res.ok;
        raw = ok ? await res.json().catch(() => null) : null;
      } else {
        const r = await getJsonWithProgress('/api/user', (ratio) => {
          setLoadProgress(40 + Math.round(60 * ratio));
        });
        ok = r.ok;
        status = r.status;
        raw = r.data;
      }

      if (ok) {
        if (raw) {
          const validated = parseAPIResponse(
            profileAPIResponseSchema,
            raw,
            'GET /api/user',
          );

          if (!validated) {
            setError("On a reçu des données bizarres. Rafraîchis la page ?");
            return;
          }

          setProfile(profileFromApiPayload(validated));
        } else {
          setProfile({ ...INITIAL_PROFILE, firstName: user.firstName || '' });
        }
      } else {
        console.error('Erreur HTTP', status);
        setError("On n'arrive pas à charger tes données. Tu réessaies ?");
      }
    } catch (err) {
      console.error('Erreur fetch:', err);
      setError('Connexion perdue. Vérifie ton réseau et réessaie.');
    } finally {
      if (!background) {
        setIsLoadingData(false);
      }
      setLoadProgress(100);
    }
  }, [user]);

  useEffect(() => {
    if (!isClerkLoaded) return;

    if (!user) {
      setIsLoadingData(false);
      setLoadProgress(100);
      syncedUserRef.current = null;
      return;
    }

    const uid = user.id;
    if (syncedUserRef.current === uid) return;
    syncedUserRef.current = uid;

    if (serverPreload?.userId === uid) {
      setProfile(serverPreload.profile);
      setIsLoadingData(false);
      setLoadProgress(100);
      void fetchData({ background: true });
      return;
    }

    void fetchData();
  }, [isClerkLoaded, user, fetchData, serverPreload]);

  const updateProfileInfo = async (updates: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const raw = await res.json();
        if (!parseAPIResponse(profilePatchResponseSchema, raw, 'PATCH /api/profile')) {
          setError("On a reçu des données bizarres. Rafraîchis la page ?");
        }
      }
    } catch (err) {
      console.error('Erreur save profile:', err);
      fetchData();
    }
  };

  const addItem = async (item: Partial<FinancialItem>) => {
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        const raw = await res.json();
        const newItem = parseAPIResponse(financialItemResponseSchema, raw, 'POST /api/items');
        if (!newItem) {
          setError("On a reçu des données bizarres. Rafraîchis la page ?");
        }
        fetchData();
        return newItem;
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteItem = async (itemId: string) => {
    setProfile((prev) => ({
      ...prev,
      incomes: prev.incomes.filter((i) => i.id !== itemId),
      fixedCosts: prev.fixedCosts.filter((i) => i.id !== itemId),
      variableCosts: prev.variableCosts.filter((i) => i.id !== itemId),
      credits: prev.credits.filter((i) => i.id !== itemId),
      subscriptions: prev.subscriptions.filter((i) => i.id !== itemId),
      annualExpenses: prev.annualExpenses.filter((i) => i.id !== itemId),
    }));

    try {
      const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        const raw = await res.json();
        if (!parseAPIResponse(successResponseSchema, raw, 'DELETE /api/items/:id')) {
          setError("On a reçu des données bizarres. Rafraîchis la page ?");
        }
      } else {
        fetchData();
      }
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

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
          setError("On a reçu des données bizarres. Rafraîchis la page ?");
        }
      }
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAsset = async (assetId: string) => {
    try {
      const res = await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
      if (res.ok) {
        const raw = await res.json();
        if (!parseAPIResponse(successResponseSchema, raw, 'DELETE /api/assets/:id')) {
          setError("On a reçu des données bizarres. Rafraîchis la page ?");
        }
      }
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

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
          setError("On a reçu des données bizarres. Rafraîchis la page ?");
        }
      }
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      const res = await fetch(`/api/goals/${goalId}`, { method: 'DELETE' });
      if (res.ok) {
        const raw = await res.json();
        if (!parseAPIResponse(successResponseSchema, raw, 'DELETE /api/goals/:id')) {
          setError("On a reçu des données bizarres. Rafraîchis la page ?");
        }
      }
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

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
          setError("On a reçu des données bizarres. Rafraîchis la page ?");
        }
      }
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteDecision = async (id: string) => {
    try {
      const res = await fetch(`/api/decisions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const raw = await res.json();
        if (!parseAPIResponse(successResponseSchema, raw, 'DELETE /api/decisions/:id')) {
          setError("On a reçu des données bizarres. Rafraîchis la page ?");
        }
      }
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const updateDecisionOutcome = async (id: string, outcome: 'SATISFIED' | 'REGRETTED' | null) => {
    const previous = profile.decisions?.find((d) => d.id === id);
    setProfile((prev) => ({
      ...prev,
      decisions: (prev.decisions || []).map((d) => (d.id === id ? { ...d, outcome } : d)),
    }));
    try {
      const res = await fetch(`/api/decisions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome }),
      });
      if (res.ok) {
        const raw = await res.json();
        if (
          !parseAPIResponse(purchaseDecisionResponseSchema, raw, 'PATCH /api/decisions/:id')
        ) {
          setError("On a reçu des données bizarres. Rafraîchis la page ?");
          fetchData();
        }
      } else {
        setProfile((prev) => ({
          ...prev,
          decisions: (prev.decisions || []).map((d) =>
            d.id === id && previous ? { ...d, outcome: previous.outcome ?? null } : d,
          ),
        }));
      }
    } catch (err) {
      console.error(err);
      setProfile((prev) => ({
        ...prev,
        decisions: (prev.decisions || []).map((d) =>
          d.id === id && previous ? { ...d, outcome: previous.outcome ?? null } : d,
        ),
      }));
    }
  };

  return {
    profile,
    isLoaded: isClerkLoaded && !isLoadingData,
    isLoading: isLoadingData,
    loadProgress,
    error,
    user,
    refreshData: () => fetchData(),
    updateProfileInfo,
    addItem,
    deleteItem,
    saveAsset,
    deleteAsset,
    saveGoal,
    deleteGoal,
    addDecision,
    deleteDecision,
    updateDecisionOutcome,
  };
}

export type FinancialDataContextValue = ReturnType<typeof useFinancialDataState>;

const FinancialDataContext = createContext<FinancialDataContextValue | null>(null);

export function FinancialDataProvider({
  children,
  serverPreload = null,
}: {
  children: ReactNode;
  serverPreload?: FinancialServerPreload;
}) {
  const value = useFinancialDataState(serverPreload ?? null);
  return <FinancialDataContext.Provider value={value}>{children}</FinancialDataContext.Provider>;
}

export function useFinancialData(): FinancialDataContextValue {
  const ctx = useContext(FinancialDataContext);
  if (!ctx) {
    throw new Error('useFinancialData doit être utilisé dans un FinancialDataProvider.');
  }
  return ctx;
}
