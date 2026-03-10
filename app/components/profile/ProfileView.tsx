'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  Wallet,
  Target,
  Pencil,
  Home,
  Users,
  ChevronDown,
  Loader2,
  Briefcase,
  Building,
  GraduationCap,
  Armchair,
  CheckCircle,
  HeartHandshake,
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
  GOAL_CATEGORIES,
  UserPersona,
} from '@/app/lib/definitions';
import type { GoalCategory } from '@prisma/client';
import { useToast } from '@/app/components/ui/Toast';
import InputGroup from '@/app/components/ui/InputGroup';
import { SelectionTile, CounterControl } from './ProfileWizardLayout';
import {
  mapProfileToForm,
  mapSectionToPayload,
} from './ProfileWizard.mappers';
import type { FormProfile } from './ProfileWizard.types';
const HOUSING_LABELS: Record<string, string> = {
  [HousingStatus.TENANT]: 'Locataire',
  [HousingStatus.OWNER_LOAN]: 'Propriétaire (crédit)',
  [HousingStatus.OWNER_PAID]: 'Propriétaire (sans crédit)',
  [HousingStatus.FREE]: 'Hébergé / Sans loyer',
};

export interface ProfileViewProps {
  profile: Profile;
  refreshData: () => Promise<void>;
  /** Clic crayon sur la carte Objectifs → page objectifs */
  onEditGoals?: () => void;
}

export function isProfileComplete(profile: Profile | null): boolean {
  if (!profile) return false;
  const hasId = profile.profileId && profile.profileId !== 'temp';
  const hasIdentity = profile.firstName && profile.age;
  return !!(hasId && hasIdentity);
}

export default function ProfileView({
  profile,
  refreshData,
  onEditGoals,
}: ProfileViewProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<FormProfile | null>(null);
  const [expandedSection, setExpandedSection] = useState<'identity' | 'situation' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFormData(mapProfileToForm(profile));
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

  const monthlyIncome =
    profile.monthlyIncome ??
    calculateListTotal(profile.incomes || []);
  const fixedTotal = calculateListTotal(profile.fixedCosts || []);
  const variableTotal = calculateListTotal(profile.variableCosts || []);
  const totalCharges = fixedTotal + variableTotal;

  const totalAssets = (profile.assets || []).reduce(
    (sum, a) => sum + safeFloat(a.currentValue),
    0
  );
  const assetCount = (profile.assets || []).length;
  const goals = profile.goals || [];

  const updateForm = (newData: FormProfile) => {
    setFormData(newData);
    if (error) setError(null);
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
        setError('Aucune donnée à enregistrer.');
        setIsSaving(false);
        return;
      }
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flat),
      });
      if (!res.ok) throw new Error('Erreur API');
      showToast('Modifications enregistrées.');
      await refreshData();
      setExpandedSection(null);
    } catch (e) {
      console.error(e);
      setError('Erreur lors de la sauvegarde.');
      showToast('Erreur lors de la sauvegarde.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleExpand = (section: 'identity' | 'situation') => {
    setExpandedSection((prev) => (prev === section ? null : section));
    setError(null);
  };

  const ExpandableCard = ({
    section,
    title,
    icon: Icon,
    iconBg,
    summary,
    children,
    onSave,
  }: {
    section: 'identity' | 'situation';
    title: string;
    icon: React.ElementType;
    iconBg: string;
    summary: React.ReactNode;
    children: React.ReactNode;
    onSave: () => void;
  }) => {
    const isExpanded = expandedSection === section;
    return (
      <GlassCard className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-2 ring-indigo-200' : ''}`}>
        <button
          type="button"
          onClick={() => toggleExpand(section)}
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
              {isExpanded ? 'Réduire' : 'Modifier'}
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
            <div className="pt-6 mt-6 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
              {formData && children}
              {error && (
                <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-sm font-bold">
                  {error}
                </div>
              )}
              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setExpandedSection(null);
                    setError(null);
                  }}
                >
                  Annuler
                </Button>
                <Button size="sm" onClick={onSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'Enregistrer'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    );
  };

  return (
    <div className="w-full animate-fade-in pb-20 md:pb-0">
      <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Identité */}
      <ExpandableCard
        section="identity"
        title="Identité"
        icon={User}
        iconBg="bg-indigo-100 text-indigo-600"
        onSave={handleSaveIdentity}
        summary={
          <>
            <p className="text-sm text-slate-600 mt-1">
              {age} • {personaLabel}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
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
          <div>
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
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Statut Pro</label>
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
            <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Logement</label>
            <div className="grid grid-cols-2 gap-2">
              <SelectionTile
                icon={Building}
                title="Locataire"
                desc="Loyer"
                selected={formData?.housing?.status === HousingStatus.TENANT}
                onClick={() => formData && updateForm({ ...formData, housing: { ...formData.housing, status: HousingStatus.TENANT } })}
              />
              <SelectionTile
                icon={Home}
                title="Propriétaire"
                desc="Crédit"
                selected={formData?.housing?.status === HousingStatus.OWNER_LOAN}
                onClick={() => formData && updateForm({ ...formData, housing: { ...formData.housing, status: HousingStatus.OWNER_LOAN } })}
              />
              <SelectionTile
                icon={CheckCircle}
                title="Propriétaire"
                desc="Payé"
                selected={formData?.housing?.status === HousingStatus.OWNER_PAID}
                onClick={() => formData && updateForm({ ...formData, housing: { ...formData.housing, status: HousingStatus.OWNER_PAID, monthlyCost: 0 } })}
              />
              <SelectionTile
                icon={HeartHandshake}
                title="Gratuit"
                desc="Hébergé"
                selected={formData?.housing?.status === HousingStatus.FREE}
                onClick={() => formData && updateForm({ ...formData, housing: { ...formData.housing, status: HousingStatus.FREE, monthlyCost: 0 } })}
              />
            </div>
          </div>
          {(formData?.housing?.status === HousingStatus.TENANT || formData?.housing?.status === HousingStatus.OWNER_LOAN) && (
            <div className="flex gap-4">
              <div className="flex-1">
                <InputGroup
                  label="Montant mensuel"
                  type="number"
                  placeholder="800"
                  value={formData?.housing?.monthlyCost || ''}
                  onChange={(val: string) =>
                    formData && updateForm({
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
                    formData && updateForm({
                      ...formData,
                      housing: { ...formData.housing, paymentDay: parseInt(val) || 1 },
                    })
                  }
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Foyer</label>
            <div className="flex gap-4">
              <CounterControl
                label="Adultes"
                value={formData?.household?.adults || 1}
                onChange={(v: number) => formData && updateForm({ ...formData, household: { ...formData.household, adults: v } })}
              />
              <CounterControl
                label="Enfants"
                value={formData?.household?.children || 0}
                onChange={(v: number) => formData && updateForm({ ...formData, household: { ...formData.household, children: v } })}
              />
            </div>
          </div>
        </div>
      </ExpandableCard>

      {/* Situation financière - pour l'instant redirige vers la page edit (formulaire trop complexe) */}
      <GlassCard>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 rounded-xl">
              <Wallet className="text-emerald-600" size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Situation financière</h2>
              <div className="mt-2 space-y-1 text-sm">
                <p className="text-slate-600">
                  <span className="text-slate-500">Revenus :</span>{' '}
                  {formatCurrency(monthlyIncome)}/mois
                </p>
                <p className="text-slate-600">
                  <span className="text-slate-500">Charges :</span>{' '}
                  {formatCurrency(totalCharges)}/mois
                </p>
                <p className="text-slate-600">
                  <span className="text-slate-500">Patrimoine :</span>{' '}
                  {formatCurrency(totalAssets)} ({assetCount} actif
                  {assetCount > 1 ? 's' : ''})
                </p>
              </div>
            </div>
          </div>
          <Link href="/profile/edit?section=finances">
            <Button variant="ghost" size="sm" title="Modifier la situation financière">
              <Pencil size={14} />
            </Button>
          </Link>
        </div>
      </GlassCard>

      {/* Objectifs */}
      <GlassCard>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-xl">
              <Target className="text-amber-600" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-slate-800">Objectifs</h2>
              {goals.length === 0 ? (
                <p className="text-sm text-slate-500 mt-1">
                  Aucun objectif défini
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {goals.slice(0, 3).map((g) => {
                    const cat = GOAL_CATEGORIES[g.category as GoalCategory];
                    return (
                      <li
                        key={g.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span>{cat?.icon ?? '•'}</span>
                          <span className="text-slate-700 truncate">{g.name}</span>
                        </span>
                        <span className="text-slate-600 shrink-0">
                          {formatCurrency(safeFloat(g.targetAmount))}
                        </span>
                      </li>
                    );
                  })}
                  {goals.length > 3 && (
                    <li className="text-sm text-slate-500">
                      +{goals.length - 3} autre(s)
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
          {onEditGoals && (
            <Button variant="ghost" size="sm" onClick={onEditGoals} title="Gérer les objectifs">
              <Pencil size={14} />
            </Button>
          )}
        </div>
      </GlassCard>

      </div>

      <div className="pt-4 text-center flex flex-wrap justify-center gap-4">
        <Link
          href="/profile/edit"
          className="text-indigo-600 font-medium hover:underline text-sm"
        >
          Modifier par section →
        </Link>
        <Link
          href="/profile?edit=1"
          className="text-slate-500 font-medium hover:underline text-sm"
        >
          Refaire tout le wizard →
        </Link>
      </div>
      </div>
    </div>
  );
}
