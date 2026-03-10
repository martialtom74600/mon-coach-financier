'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import { computeFinancialPlan } from '@/app/lib/engine';
import { calculateListTotal } from '@/app/lib/definitions';
import { useToast } from '@/app/components/ui/Toast';
import PageLoader from '@/app/components/ui/PageLoader';
import GlassCard from '@/app/components/ui/GlassCard';
import { Pencil, User, Wallet, Flag, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { FormProfile, FormItem } from '@/app/components/profile/ProfileWizard.types';
import {
  mapProfileToForm,
  mapSectionToPayload,
  mapFormToEngineProfile,
  generateIdHelper,
} from '@/app/components/profile/ProfileWizard.mappers';
import { StepIdentity } from '@/app/components/profile/steps/StepIdentity';
import { StepSituation } from '@/app/components/profile/steps/StepSituation';
import { StepFixedCosts } from '@/app/components/profile/steps/StepFixedCosts';
import { StepDailyLife } from '@/app/components/profile/steps/StepDailyLife';
import { StepAssets } from '@/app/components/profile/steps/StepAssets';
import { StepStrategy } from '@/app/components/profile/steps/StepStrategy';
import { isProfileComplete } from '@/app/components/profile/ProfileView';

type SaveSection = 'identity' | 'situation' | 'charges' | 'assets' | 'strategy';

export default function ProfileEditClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, isLoaded, refreshData } = useFinancialData();
  const { showToast } = useToast();
  const sectionParam = searchParams.get('section') || '';
  const [formData, setFormData] = useState<FormProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && profile && !formData) {
      setFormData(mapProfileToForm(profile));
    }
  }, [isLoaded, profile, formData]);

  const simulation = useMemo(() => {
    if (!formData) return null;
    return computeFinancialPlan(mapFormToEngineProfile(formData));
  }, [formData]);

  const wizardStats = useMemo(() => {
    if (!simulation || !formData) return null;
    const { budget } = simulation;
    const monthlyInvestments = formData.assetsUi
      .filter((a) => a.type !== 'CC' && a.type !== 'cc')
      .reduce((sum, item) => sum + (item.monthlyFlow || 0), 0);
    const monthlyVariable = calculateListTotal(formData.variableCosts || []);
    const totalEngaged = budget.mandatoryExpenses + monthlyInvestments + monthlyVariable;
    const ratio = budget.monthlyIncome > 0 ? (totalEngaged / budget.monthlyIncome) * 100 : 0;
    const remaining = Math.max(0, budget.monthlyIncome - totalEngaged);
    return {
      income: budget.monthlyIncome,
      fixed: budget.mandatoryExpenses,
      variable: monthlyVariable,
      investments: monthlyInvestments,
      totalEngaged,
      ratio,
      remaining,
    };
  }, [simulation, formData]);

  const updateForm = (newData: FormProfile) => {
    setFormData(newData);
    if (error) setError(null);
  };

  const updateItem = (list: keyof FormProfile, id: string, field: string, val: string | number) => {
    if (!formData) return;
    const currentList = formData[list] as FormItem[];
    updateForm({ ...formData, [list]: currentList.map((i) => (i.id === id ? { ...i, [field]: val } : i)) });
  };
  const addItem = (list: keyof FormProfile) => {
    if (!formData) return;
    const currentList = formData[list] as FormItem[];
    const defaultDay = list === 'variableCosts' ? undefined : 1;
    updateForm({
      ...formData,
      [list]: [
        ...currentList,
        { id: generateIdHelper(), name: '', amount: '', frequency: 'MONTHLY', dayOfMonth: defaultDay },
      ],
    });
  };
  const removeItem = (list: keyof FormProfile, id: string) => {
    if (!formData) return;
    const currentList = formData[list] as FormItem[];
    updateForm({ ...formData, [list]: currentList.filter((i) => i.id !== id) });
  };

  const handleSaveSection = async (section: SaveSection, lifestyle?: number) => {
    if (!formData || isSaving) return;

    setIsSaving(true);
    setError(null);
    try {
      const payload = mapSectionToPayload(section, formData, lifestyle);
      const hasData = Object.keys(payload).some((k) => {
        const v = payload[k as keyof typeof payload];
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'object' && v !== null) return Object.keys(v).length > 0;
        return v !== undefined && v !== null;
      });
      if (!hasData) {
        setError('Aucune donnée à enregistrer.');
        setIsSaving(false);
        return;
      }

      const usePatch = section === 'identity' || section === 'situation' || section === 'strategy';
      let body: string;
      let url: string;
      let method: string;

      if (usePatch) {
        const flat: Record<string, unknown> = {};
        if (payload.firstName !== undefined) flat.firstName = payload.firstName;
        if (payload.profile) {
          Object.entries(payload.profile).forEach(([k, v]) => {
            if (v !== undefined && v !== null) flat[k] = v;
          });
        }
        url = '/api/profile';
        method = 'PATCH';
        body = JSON.stringify(flat);
      } else {
        url = '/api/user';
        method = 'POST';
        body = JSON.stringify(payload);
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!res.ok) throw new Error('Erreur API');
      showToast('Modifications enregistrées.');
      await refreshData();
    } catch (e) {
      console.error(e);
      setError('Erreur lors de la sauvegarde.');
      showToast('Erreur lors de la sauvegarde.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded || !formData) {
    return <PageLoader />;
  }

  if (!isProfileComplete(profile)) {
    router.replace('/profile?edit=1');
    return null;
  }

  // Une seule section affichée selon ?section= (pas de liste interminable)
  const showOnlySection = sectionParam === 'identity' || sectionParam === 'finances' || sectionParam === 'strategy';

  const renderSectionPicker = () => (
    <div className="space-y-4">
      <p className="text-slate-600 text-sm">Choisissez la section à modifier :</p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Link href="/profile/edit?section=identity">
          <GlassCard className="flex items-center gap-4 p-4 hover:border-indigo-200 transition-colors cursor-pointer">
            <div className="p-2.5 bg-indigo-100 rounded-xl">
              <User className="text-indigo-600" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800">Identité</h3>
              <p className="text-sm text-slate-500">Prénom, âge, statut, logement, foyer</p>
            </div>
            <ArrowLeft className="rotate-180 text-slate-400" size={18} />
          </GlassCard>
        </Link>
        <Link href="/profile/edit?section=finances">
          <GlassCard className="flex items-center gap-4 p-4 hover:border-indigo-200 transition-colors cursor-pointer">
            <div className="p-2.5 bg-emerald-100 rounded-xl">
              <Wallet className="text-emerald-600" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800">Situation financière</h3>
              <p className="text-sm text-slate-500">Revenus, charges, patrimoine</p>
            </div>
            <ArrowLeft className="rotate-180 text-slate-400" size={18} />
          </GlassCard>
        </Link>
        <Link href="/profile/edit?section=strategy">
          <GlassCard className="flex items-center gap-4 p-4 hover:border-indigo-200 transition-colors cursor-pointer">
            <div className="p-2.5 bg-amber-100 rounded-xl">
              <Flag className="text-amber-600" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800">Stratégie</h3>
              <p className="text-sm text-slate-500">Budget plaisir</p>
            </div>
            <ArrowLeft className="rotate-180 text-slate-400" size={18} />
          </GlassCard>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="w-full animate-fade-in pb-20 md:pb-0">
      <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 rounded-xl">
            <Pencil className="text-indigo-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {showOnlySection
                ? sectionParam === 'identity'
                  ? 'Modifier l\'identité'
                  : sectionParam === 'finances'
                    ? 'Modifier la situation financière'
                    : 'Modifier la stratégie'
                : 'Modifier mon profil'}
            </h1>
            <p className="text-sm text-slate-500">
              {showOnlySection ? 'Modifiez uniquement cette section' : 'Choisissez une section à modifier'}
            </p>
          </div>
        </div>
        <Link href={showOnlySection ? '/profile/edit' : '/profile'}>
          <span className="text-indigo-600 font-medium hover:underline text-sm flex items-center gap-1">
            <ArrowLeft size={16} />
            {showOnlySection ? 'Autres sections' : 'Retour au profil'}
          </span>
        </Link>
      </div>

      {!showOnlySection ? (
        <>
          {renderSectionPicker()}
          <div className="pt-4 text-center">
            <Link href="/profile?edit=1" className="text-slate-500 font-medium hover:underline text-sm">
              Refaire tout le wizard →
            </Link>
          </div>
        </>
      ) : sectionParam === 'identity' ? (
        <GlassCard className="space-y-6">
          <StepIdentity
            formData={formData}
            updateForm={updateForm}
            error={error}
            editMode
            onSave={() => handleSaveSection('identity')}
            isSaving={isSaving}
          />
          <StepSituation
            formData={formData}
            updateForm={updateForm}
            error={error}
            editMode
            onSave={() => handleSaveSection('situation')}
            isSaving={isSaving}
          />
        </GlassCard>
      ) : sectionParam === 'finances' ? (
        <GlassCard className="space-y-6">
          <StepFixedCosts
            formData={formData}
            updateForm={updateForm}
            addItem={addItem}
            removeItem={removeItem}
            updateItem={updateItem}
            error={error}
            editMode
            onSave={() => handleSaveSection('charges')}
            isSaving={isSaving}
          />
          <StepDailyLife
            formData={formData}
            updateForm={updateForm}
            addItem={addItem}
            removeItem={removeItem}
            updateItem={updateItem}
            error={error}
            editMode
            onSave={() => handleSaveSection('charges')}
            isSaving={isSaving}
          />
          <StepAssets
            formData={formData}
            updateForm={updateForm}
            addItem={addItem}
            removeItem={removeItem}
            updateItem={updateItem}
            error={error}
            editMode
            onSave={() => handleSaveSection('assets')}
            isSaving={isSaving}
          />
        </GlassCard>
      ) : sectionParam === 'strategy' ? (
        <GlassCard>
          <StepStrategy
            formData={formData}
            updateForm={updateForm}
            stats={wizardStats}
            error={error}
            editMode
            onSave={(lifestyle) => handleSaveSection('strategy', lifestyle)}
            isSaving={isSaving}
          />
        </GlassCard>
      ) : null}

      {showOnlySection && (
        <div className="pt-4 text-center flex flex-wrap justify-center gap-4">
          <Link href="/profile" className="text-indigo-600 font-medium hover:underline text-sm">
            Retour au profil →
          </Link>
          <Link href="/profile?edit=1" className="text-slate-500 font-medium hover:underline text-sm">
            Refaire tout le wizard →
          </Link>
        </div>
      )}
      </div>
    </div>
  );
}
