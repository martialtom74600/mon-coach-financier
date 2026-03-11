'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  User,
  Wallet,
  Banknote,
  CreditCard,
  PiggyBank,
  ChevronDown,
  ArrowRight,
  Loader2,
  Flag,
  Briefcase,
  Building,
  GraduationCap,
  Armchair,
  CheckCircle,
  HeartHandshake,
  Home,
  Users,
  Zap,
  Calendar,
  ShoppingCart,
  AlertCircle,
} from 'lucide-react';
import GlassCard from '@/app/components/ui/GlassCard';
import Button from '@/app/components/ui/Button';
import {
  Profile,
  formatCurrency,
  calculateListTotal,
  PERSONA_PRESETS,
  HousingStatus,
  safeFloat,
  UserPersona,
} from '@/app/lib/definitions';
import { useToast } from '@/app/components/ui/Toast';
import InputGroup from '@/app/components/ui/InputGroup';
import AccordionSection from '@/app/components/AccordionSection';
import { SelectionTile, CounterControl } from './ProfileWizardLayout';
import {
  mapProfileToForm,
  mapSectionToPayload,
  mapFormToEngineProfile,
  generateIdHelper,
} from './ProfileWizard.mappers';
import type { FormProfile, FormItem } from './ProfileWizard.types';
import { StepAssets } from './steps/StepAssets';
import { StepStrategy } from './steps/StepStrategy';
import { computeFinancialPlan } from '@/app/lib/engine';

const HOUSING_LABELS: Record<string, string> = {
  [HousingStatus.TENANT]: 'Locataire',
  [HousingStatus.OWNER_LOAN]: 'Propriétaire (crédit)',
  [HousingStatus.OWNER_PAID]: 'Propriétaire (sans crédit)',
  [HousingStatus.FREE]: 'Hébergé / Sans loyer',
};

type ExpandableSection = 'identity' | 'revenues' | 'charges' | 'assets' | 'strategy' | null;

function ExpandableCard({
  section,
  title,
  icon: Icon,
  iconBg,
  summary,
  children,
  onSave,
  expandedSection,
  onToggleExpand,
  formData,
  error,
  onClearError,
  isSaving,
}: {
  section: ExpandableSection;
  title: string;
  icon: React.ElementType;
  iconBg: string;
  summary: React.ReactNode;
  children: React.ReactNode;
  onSave: () => void;
  expandedSection: ExpandableSection;
  onToggleExpand: (s: ExpandableSection) => void;
  formData: FormProfile | null;
  error: string | null;
  onClearError: () => void;
  isSaving: boolean;
}) {
  const isExpanded = expandedSection === section;
  return (
    <GlassCard
      className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-2 ring-indigo-200' : ''}`}
    >
      <button
        type="button"
        onClick={() => onToggleExpand(section)}
        className="w-full text-left flex items-start justify-between p-0 bg-transparent border-none cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${iconBg}`}>
            <Icon className="text-inherit" size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">{title}</h2>
            {summary}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400 hidden sm:inline">
            {isExpanded ? 'Fermer' : 'Modifier'}
          </span>
          <ChevronDown
            size={18}
            className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pt-6 mt-6 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300 flex flex-col">
            <div className="max-h-[55vh] overflow-y-auto overscroll-contain pr-1 -mr-1">
              {formData && children}
              {error && (
                <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-bold">
                  {error}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 shrink-0 border-t border-slate-100 mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onToggleExpand(null);
                  onClearError();
                }}
              >
                Pas grave
              </Button>
              <Button size="sm" onClick={onSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'C\'est bon'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export interface ProfileViewProps {
  profile: Profile;
  refreshData?: () => Promise<void>;
}

export function isProfileComplete(profile: Profile | null): boolean {
  if (!profile) return false;
  const hasId = profile.profileId && profile.profileId !== 'temp';
  const hasIdentity = profile.firstName && profile.age;
  return !!(hasId && hasIdentity);
}

export default function ProfileView({ profile, refreshData }: ProfileViewProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<FormProfile | null>(null);
  const [expandedSection, setExpandedSection] = useState<ExpandableSection>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData(mapProfileToForm(profile));
      setHasUnsavedChanges(false);
    }
  }, [profile]);

  const age = profile.age ? `${profile.age} ans` : '-';
  const personaLabel =
    profile.persona && PERSONA_PRESETS[profile.persona]
      ? PERSONA_PRESETS[profile.persona].label
      : '-';
  const housingLabel = profile.housing?.status
    ? HOUSING_LABELS[profile.housing.status] || profile.housing.status
    : '-';
  const housingCost = safeFloat(profile.housing?.monthlyCost ?? profile.housingCost ?? 0);

  const monthlyIncome = formData
    ? calculateListTotal(formData.incomes || [])
    : (profile.monthlyIncome ?? calculateListTotal(profile.incomes || []));
  const fixedTotal = calculateListTotal(profile.fixedCosts || []);
  const variableTotal = calculateListTotal(profile.variableCosts || []);
  const totalCharges = fixedTotal + variableTotal;
  const totalAssets = (profile.assets || []).reduce(
    (sum, a) => sum + safeFloat(a.currentValue),
    0
  );
  const assetCount = (profile.assets || []).length;

  const wizardStats = useMemo(() => {
    if (!formData) return null;
    const simulation = computeFinancialPlan(mapFormToEngineProfile(formData));
    const { budget } = simulation;
    const monthlyInvestments = formData.assetsUi
      .filter((a) => a.type !== 'CC' && a.type !== 'cc')
      .reduce((sum, item) => sum + (item.monthlyFlow || 0), 0);
    const monthlyVariable = calculateListTotal(formData.variableCosts || []);
    const totalEngaged = budget.mandatoryExpenses + monthlyInvestments + monthlyVariable;
    const remaining = Math.max(0, budget.monthlyIncome - totalEngaged);
    return {
      income: budget.monthlyIncome,
      fixed: budget.mandatoryExpenses,
      variable: monthlyVariable,
      investments: monthlyInvestments,
      totalEngaged,
      ratio: budget.monthlyIncome > 0 ? (totalEngaged / budget.monthlyIncome) * 100 : 0,
      remaining,
    };
  }, [formData]);

  const updateForm = (newData: FormProfile) => {
    setFormData(newData);
    setHasUnsavedChanges(true);
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

  const toggleExpand = (section: ExpandableSection) => {
    setExpandedSection((prev) => (prev === section ? null : section));
    setError(null);
  };

  const handleSaveIdentity = async () => {
    if (!formData || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const identityPayload = mapSectionToPayload('identity', formData);
      const situationPayload = mapSectionToPayload('situation', formData);
      const flat: Record<string, unknown> = {};
      if (identityPayload.firstName !== undefined) flat.firstName = identityPayload.firstName;
      if (identityPayload.profile) Object.assign(flat, identityPayload.profile);
      if (situationPayload.profile) Object.assign(flat, situationPayload.profile);
      if (Object.keys(flat).length === 0) {
        setError('Rien à sauvegarder pour l\'instant.');
        setIsSaving(false);
        return;
      }
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flat),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = (errBody as { error?: string; details?: unknown[] })?.error || res.statusText || 'Oups, petit bug. Tu réessaies ?';
        throw new Error(msg);
      }
      showToast('C\'est enregistré !');
      setHasUnsavedChanges(false);
      if (typeof refreshData === 'function') await refreshData();
      setExpandedSection(null);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Oups, ça n\'a pas marché. Réessaie ?';
      setError(msg);
      showToast(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveItems = async (section: 'revenues' | 'charges' = 'charges') => {
    if (!formData || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload = mapSectionToPayload(section, formData);
      const hasData = payload.items && payload.items.length > 0;
      if (!hasData) {
        setError('Rien à sauvegarder pour l\'instant.');
        setIsSaving(false);
        return;
      }
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = (errBody as { error?: string })?.error || res.statusText || 'Oups, petit bug. Tu réessaies ?';
        throw new Error(msg);
      }
      showToast('C\'est enregistré !');
      setHasUnsavedChanges(false);
      if (typeof refreshData === 'function') await refreshData();
      setExpandedSection(null);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Oups, ça n\'a pas marché. Réessaie ?';
      setError(msg);
      showToast(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAssets = async () => {
    if (!formData || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload = mapSectionToPayload('assets', formData);
      const hasData = payload.assets && payload.assets.length > 0;
      if (!hasData) {
        setError('Rien à sauvegarder pour l\'instant.');
        setIsSaving(false);
        return;
      }
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = (errBody as { error?: string })?.error || res.statusText || 'Oups, petit bug. Tu réessaies ?';
        throw new Error(msg);
      }
      showToast('C\'est enregistré !');
      setHasUnsavedChanges(false);
      if (typeof refreshData === 'function') await refreshData();
      setExpandedSection(null);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Oups, ça n\'a pas marché. Réessaie ?';
      setError(msg);
      showToast(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStrategy = async (funBudget?: number) => {
    if (isSaving || !formData) return;
    const value = funBudget ?? formData.funBudget ?? 0;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funBudget: value }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = (errBody as { error?: string })?.error || res.statusText || 'Oups, petit bug. Tu réessaies ?';
        throw new Error(msg);
      }
      showToast('C\'est enregistré !');
      setHasUnsavedChanges(false);
      setFormData({ ...formData, funBudget: value });
      if (typeof refreshData === 'function') await refreshData();
      setExpandedSection(null);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Oups, ça n\'a pas marché. Réessaie ?';
      setError(msg);
      showToast(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full animate-fade-in pb-20 md:pb-0">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Identité */}
          <ExpandableCard
            section="identity"
            title="Identité"
            icon={User}
            iconBg="bg-indigo-100 text-indigo-600"
            onSave={handleSaveIdentity}
            expandedSection={expandedSection}
            onToggleExpand={toggleExpand}
            formData={formData}
            error={error}
            onClearError={() => setError(null)}
            isSaving={isSaving}
            summary={
              <>
                <p className="text-sm text-slate-600 mt-1">
                  {age} • {personaLabel}
                </p>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Home size={14} />
                    {housingLabel}
                    {housingCost > 0 && ` (${formatCurrency(housingCost)}/mois)`}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={14} />
                    {profile.household?.adults ?? profile.adults ?? 1} adulte
                    {(profile.household?.children ?? profile.children ?? 0) > 0 &&
                      `, ${profile.household?.children ?? profile.children} enfant(s)`}
                  </span>
                </div>
              </>
            }
          >
            <div className="space-y-6">
              <InputGroup
                label="Prénom"
                placeholder="Ex: Thomas"
                value={formData?.firstName || ''}
                onChange={(val: string) => formData && updateForm({ ...formData, firstName: val })}
              />
              <InputGroup
                label="Âge"
                type="number"
                placeholder="30"
                value={formData?.age || ''}
                onChange={(val: string) => formData && updateForm({ ...formData, age: val as unknown as number })}
              />
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Ton statut</label>
                <div className="grid grid-cols-2 gap-2">
                  <SelectionTile
                    icon={Briefcase}
                    title="Salarié"
                    desc="CDI / CDD"
                    selected={formData?.persona === UserPersona.SALARIED}
                    onClick={() => formData && updateForm({ ...formData, persona: UserPersona.SALARIED })}
                  />
                  <SelectionTile
                    icon={GraduationCap}
                    title="Étudiant"
                    desc="Études"
                    selected={formData?.persona === UserPersona.STUDENT}
                    onClick={() => formData && updateForm({ ...formData, persona: UserPersona.STUDENT })}
                  />
                  <SelectionTile
                    icon={Briefcase}
                    title="Indépendant"
                    desc="Freelance"
                    selected={formData?.persona === UserPersona.FREELANCE}
                    onClick={() => formData && updateForm({ ...formData, persona: UserPersona.FREELANCE })}
                  />
                  <SelectionTile
                    icon={Armchair}
                    title="Retraité"
                    desc="Pension"
                    selected={formData?.persona === UserPersona.RETIRED}
                    onClick={() => formData && updateForm({ ...formData, persona: UserPersona.RETIRED })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Ton logement</label>
                <div className="grid grid-cols-2 gap-2">
                  <SelectionTile
                    icon={Building}
                    title="Locataire"
                    desc="Loyer"
                    selected={formData?.housing?.status === HousingStatus.TENANT}
                    onClick={() =>
                      formData && updateForm({ ...formData, housing: { ...formData.housing, status: HousingStatus.TENANT } })
                    }
                  />
                  <SelectionTile
                    icon={Home}
                    title="Propriétaire"
                    desc="Crédit"
                    selected={formData?.housing?.status === HousingStatus.OWNER_LOAN}
                    onClick={() =>
                      formData &&
                      updateForm({ ...formData, housing: { ...formData.housing, status: HousingStatus.OWNER_LOAN } })
                    }
                  />
                  <SelectionTile
                    icon={CheckCircle}
                    title="Propriétaire"
                    desc="Payé"
                    selected={formData?.housing?.status === HousingStatus.OWNER_PAID}
                    onClick={() =>
                      formData &&
                      updateForm({
                        ...formData,
                        housing: { ...formData.housing, status: HousingStatus.OWNER_PAID, monthlyCost: 0 },
                      })
                    }
                  />
                  <SelectionTile
                    icon={HeartHandshake}
                    title="Gratuit"
                    desc="Hébergé"
                    selected={formData?.housing?.status === HousingStatus.FREE}
                    onClick={() =>
                      formData &&
                      updateForm({
                        ...formData,
                        housing: { ...formData.housing, status: HousingStatus.FREE, monthlyCost: 0 },
                      })
                    }
                  />
                </div>
              </div>
              {(formData?.housing?.status === HousingStatus.TENANT ||
                formData?.housing?.status === HousingStatus.OWNER_LOAN) && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <InputGroup
                      label="Montant mensuel"
                      type="number"
                      placeholder="800"
                      value={formData?.housing?.monthlyCost || ''}
                      onChange={(val: string) =>
                        formData &&
                        updateForm({
                          ...formData,
                          housing: { ...formData.housing, monthlyCost: parseFloat(val) || 0 },
                        })
                      }
                      suffix="€"
                    />
                  </div>
                  <div className="w-24">
                    <InputGroup
                      label="Jour"
                      type="number"
                      placeholder="5"
                      value={formData?.housing?.paymentDay || ''}
                      onChange={(val: string) =>
                        formData &&
                        updateForm({
                          ...formData,
                          housing: { ...formData.housing, paymentDay: parseInt(val) || 1 },
                        })
                      }
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Ton foyer</label>
                <div className="flex gap-4">
                  <CounterControl
                    label="Adultes"
                    value={formData?.household?.adults || 1}
                    onChange={(v: number) =>
                      formData && updateForm({ ...formData, household: { ...formData.household, adults: v } })
                    }
                  />
                  <CounterControl
                    label="Enfants"
                    value={formData?.household?.children || 0}
                    onChange={(v: number) =>
                      formData && updateForm({ ...formData, household: { ...formData.household, children: v } })
                    }
                  />
                </div>
              </div>
            </div>
          </ExpandableCard>

          {/* Revenus */}
          <ExpandableCard
            section="revenues"
            title="Revenus"
            icon={Banknote}
            iconBg="bg-emerald-100 text-emerald-600"
            onSave={() => handleSaveItems('revenues')}
            expandedSection={expandedSection}
            onToggleExpand={toggleExpand}
            formData={formData}
            error={error}
            onClearError={() => setError(null)}
            isSaving={isSaving}
            summary={
              <p className="text-sm text-slate-600 mt-1">
                {formatCurrency(monthlyIncome)}/mois
              </p>
            }
          >
            <AccordionSection
              mode="expert"
              defaultOpen={true}
              title="Revenus (Net)"
              icon={Banknote}
              colorClass="text-emerald-600"
              items={formData?.incomes || []}
              onItemChange={(id, f, v) => updateItem('incomes', id, f as string, v)}
              onItemAdd={() => addItem('incomes')}
              onItemRemove={(id) => removeItem('incomes', id)}
            />
          </ExpandableCard>

          {/* Charges */}
          <ExpandableCard
            section="charges"
            title="Mes dépenses"
            icon={CreditCard}
            iconBg="bg-amber-100 text-amber-600"
            onSave={() => handleSaveItems('charges')}
            expandedSection={expandedSection}
            onToggleExpand={toggleExpand}
            formData={formData}
            error={error}
            onClearError={() => setError(null)}
            isSaving={isSaving}
            summary={
              <p className="text-sm text-slate-600 mt-1">
                {formatCurrency(totalCharges)}/mois
              </p>
            }
          >
            <div className="space-y-4">
              <AccordionSection
                mode="expert"
                defaultOpen={false}
                title="Factures fixes"
                icon={CreditCard}
                colorClass="text-slate-600"
                items={formData?.fixedCosts || []}
                onItemChange={(id, f, v) => updateItem('fixedCosts', id, f as string, v)}
                onItemAdd={() => addItem('fixedCosts')}
                onItemRemove={(id) => removeItem('fixedCosts', id)}
              />
              <AccordionSection
                mode="expert"
                defaultOpen={false}
                title="Abonnements"
                icon={Zap}
                colorClass="text-purple-500"
                items={formData?.subscriptions || []}
                onItemChange={(id, f, v) => updateItem('subscriptions', id, f as string, v)}
                onItemAdd={() => addItem('subscriptions')}
                onItemRemove={(id) => removeItem('subscriptions', id)}
              />
              <AccordionSection
                mode="expert"
                defaultOpen={false}
                title="Dépenses annuelles"
                icon={Calendar}
                colorClass="text-orange-500"
                items={formData?.annualExpenses || []}
                onItemChange={(id, f, v) => updateItem('annualExpenses', id, f as string, v)}
                onItemAdd={() => addItem('annualExpenses')}
                onItemRemove={(id) => removeItem('annualExpenses', id)}
              />
              <AccordionSection
                mode="expert"
                defaultOpen={false}
                title="Crédits Conso"
                icon={AlertCircle}
                colorClass="text-rose-500"
                items={formData?.credits || []}
                onItemChange={(id, f, v) => updateItem('credits', id, f as string, v)}
                onItemAdd={() => addItem('credits')}
                onItemRemove={(id) => removeItem('credits', id)}
              />
              <div className="p-4 bg-yellow-50 rounded-xl text-sm text-yellow-800 border border-yellow-100 flex items-start gap-3">
                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                <span>Courses, sorties, tout ce qui bouge chaque mois.</span>
              </div>
              <AccordionSection
                mode="expert"
                hideDate={true}
                defaultOpen={false}
                title="Courses & loisirs"
                icon={ShoppingCart}
                colorClass="text-indigo-600"
                items={formData?.variableCosts || []}
                onItemChange={(id, f, v) => updateItem('variableCosts', id, f as string, v)}
                onItemAdd={() => addItem('variableCosts')}
                onItemRemove={(id) => removeItem('variableCosts', id)}
              />
            </div>
          </ExpandableCard>

          {/* Patrimoine */}
          <ExpandableCard
            section="assets"
            title="Mon argent"
            icon={PiggyBank}
            iconBg="bg-indigo-100 text-indigo-600"
            onSave={handleSaveAssets}
            expandedSection={expandedSection}
            onToggleExpand={toggleExpand}
            formData={formData}
            error={error}
            onClearError={() => setError(null)}
            isSaving={isSaving}
            summary={
              <p className="text-sm text-slate-600 mt-1">
                {formatCurrency(totalAssets)} ({assetCount} actif{assetCount > 1 ? 's' : ''})
              </p>
            }
          >
            <StepAssets
              formData={formData!}
              updateForm={updateForm}
              addItem={addItem}
              removeItem={removeItem}
              updateItem={updateItem}
              editMode
              isSaving={isSaving}
              hideFooter
            />
          </ExpandableCard>

          {/* Stratégie / Budget Plaisir */}
          <ExpandableCard
            section="strategy"
            title="Mon budget sorties"
            icon={Flag}
            iconBg="bg-emerald-100 text-emerald-600"
            onSave={() => handleSaveStrategy()}
            expandedSection={expandedSection}
            onToggleExpand={toggleExpand}
            formData={formData}
            error={error}
            onClearError={() => setError(null)}
            isSaving={isSaving}
            summary={
              <p className="text-sm text-slate-600 mt-1">
                {wizardStats ? formatCurrency(wizardStats.remaining) : '-'} disponible / {formatCurrency(formData?.funBudget ?? profile.funBudget ?? 0)} alloué
              </p>
            }
          >
            {wizardStats && (
              <StepStrategy
                formData={formData!}
                updateForm={updateForm}
                onSave={handleSaveStrategy}
                isSaving={isSaving}
                stats={wizardStats}
                editMode
                hideFooter
              />
            )}
          </ExpandableCard>
        </div>

        <div className="pt-4 text-center flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-indigo-600 font-medium hover:text-indigo-700 hover:underline text-sm"
          >
            Voir où t&apos;en es
            <ArrowRight size={16} />
          </Link>
          <Link href="/profile/edit" className="text-slate-500 font-medium hover:underline text-sm">
            Tout reprendre depuis le début →
          </Link>
        </div>
      </div>
    </div>
  );
}
