'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import { computeFinancialPlan as runSimulation } from '@/app/lib/engine';
import { calculateListTotal } from '@/app/lib/definitions';
import { ItemCategory } from '@/app/lib/definitions';
import { HousingStatus } from '@/app/lib/definitions';
import { Frequency } from '@/app/lib/definitions';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import { useToast } from '@/app/components/ui/Toast';
import ProgressBar from '@/app/components/ui/ProgressBar';
import { Loader2 } from 'lucide-react';
import type { FormProfile, FormItem } from './ProfileWizard.types';
import { mapProfileToForm, mapFormToPayload, mapFormToEngineProfile, generateIdHelper } from './ProfileWizard.mappers';
import { LiveSummary } from './ProfileWizardLayout';
import { StepIdentity } from './steps/StepIdentity';
import { StepSituation } from './steps/StepSituation';
import { StepFixedCosts } from './steps/StepFixedCosts';
import { StepDailyLife } from './steps/StepDailyLife';
import { StepAssets } from './steps/StepAssets';
import { StepStrategy } from './steps/StepStrategy';

export default function ProfileWizard() {
  const router = useRouter();
  const { profile, isLoaded } = useFinancialData();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
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
    return runSimulation(mapFormToEngineProfile(formData));
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

  const validateCurrentStep = (step: number): boolean => {
    if (!formData) return false;

    if (step === 1) {
      if (!formData.firstName) {
        setError('Veuillez renseigner votre prénom.');
        return false;
      }
      if (!formData.age || parseInt(String(formData.age)) <= 0) {
        setError('Veuillez renseigner un âge valide.');
        return false;
      }
    }

    if (step === 3) {
      const s = formData.housing?.status;
      if (s === HousingStatus.TENANT || s === HousingStatus.OWNER_LOAN) {
        if (!formData.housing.monthlyCost || formData.housing.monthlyCost <= 0) {
          setError('Veuillez indiquer le montant de votre loyer/crédit.');
          return false;
        }
        if (
          !formData.housing.paymentDay ||
          formData.housing.paymentDay < 1 ||
          formData.housing.paymentDay > 31
        ) {
          setError('Veuillez indiquer le jour de prélèvement du logement (1-31).');
          return false;
        }
      }

      const checkList = (list: FormItem[], name: string) => {
        for (const item of list) {
          if (!item.name || (item.name as string).trim() === '')
            return `Une ligne dans "${name}" n'a pas de nom.`;
          if (!item.amount || isNaN(Number(item.amount)))
            return `Une ligne dans "${name}" n'a pas de montant.`;
          if (
            item.category !== ItemCategory.ANNUAL_EXPENSE &&
            (!item.dayOfMonth || item.dayOfMonth < 1 || item.dayOfMonth > 31)
          )
            return `Une ligne dans "${name}" n'a pas de date de prélèvement valide.`;
        }
        return null;
      };

      let err = checkList(formData.incomes, 'Revenus');
      if (err) {
        setError(err);
        return false;
      }
      err = checkList(formData.fixedCosts, 'Factures Fixes');
      if (err) {
        setError(err);
        return false;
      }
      err = checkList(formData.credits, 'Crédits');
      if (err) {
        setError(err);
        return false;
      }
    }

    if (step === 4) {
      for (const item of formData.variableCosts) {
        if (!item.name || (item.name as string).trim() === '') {
          setError("Une dépense courante n'a pas de nom.");
          return false;
        }
      }
    }

    if (step === 5) {
      for (const asset of formData.assetsUi) {
        if (!asset.name || asset.name.trim() === '') {
          setError("Un de vos comptes n'a pas de nom.");
          return false;
        }
        if (asset.stock === undefined || isNaN(asset.stock)) {
          setError(`Le solde du compte "${asset.name}" est invalide.`);
          return false;
        }
        if (asset.type !== 'CC' && asset.type !== 'cc' && asset.monthlyFlow > 0) {
          if (!asset.transferDay || asset.transferDay < 1 || asset.transferDay > 31) {
            setError(`Veuillez indiquer le jour du virement pour "${asset.name}".`);
            return false;
          }
        }
      }
    }

    setError(null);
    return true;
  };

  const goNext = () => {
    if (validateCurrentStep(currentStep)) {
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const goPrev = () => {
    setError(null);
    setCurrentStep((s) => Math.max(1, s - 1));
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
        { id: generateIdHelper(), name: '', amount: '', frequency: Frequency.MONTHLY, dayOfMonth: defaultDay },
      ],
    });
  };
  const removeItem = (list: keyof FormProfile, id: string) => {
    if (!formData) return;
    const currentList = formData[list] as FormItem[];
    updateForm({ ...formData, [list]: currentList.filter((i) => i.id !== id) });
  };

  const handleSaveAndExit = async (lifestyle: number, _savingsFromWizard: number) => {
    if (isSaving || !formData) return;
    setIsSaving(true);
    try {
      const finalPayload = mapFormToPayload(formData, lifestyle);
      const response = await fetch('/api/user', {
        method: 'POST',
        body: JSON.stringify(finalPayload),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Erreur API');
      router.push('/');
    } catch (e) {
      console.error(e);
      setIsSaving(false);
      showToast('Erreur lors de la sauvegarde.');
    }
  };

  if (!isLoaded || !formData)
    return (
      <div className="h-[50vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-xl mx-auto lg:mx-0">
          <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            <span>Progression</span>
            <span>{Math.round((currentStep / 6) * 100)}%</span>
          </div>
          <ProgressBar value={(currentStep / 6) * 100} className="h-2" />
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-start">
          <div className="lg:col-span-7 xl:col-span-8">
            {currentStep === 1 && (
              <StepIdentity formData={formData} updateForm={updateForm} onNext={goNext} error={error} />
            )}
            {currentStep === 2 && (
              <StepSituation
                formData={formData}
                updateForm={updateForm}
                onNext={goNext}
                onPrev={goPrev}
                error={error}
              />
            )}
            {currentStep === 3 && (
              <StepFixedCosts
                formData={formData}
                updateForm={updateForm}
                addItem={addItem}
                removeItem={removeItem}
                updateItem={updateItem}
                onNext={goNext}
                onPrev={goPrev}
                error={error}
              />
            )}
            {currentStep === 4 && (
              <StepDailyLife
                formData={formData}
                updateForm={updateForm}
                addItem={addItem}
                removeItem={removeItem}
                updateItem={updateItem}
                onNext={goNext}
                onPrev={goPrev}
                error={error}
              />
            )}
            {currentStep === 5 && (
              <StepAssets
                formData={formData}
                updateForm={updateForm}
                addItem={addItem}
                removeItem={removeItem}
                updateItem={updateItem}
                onNext={goNext}
                onPrev={goPrev}
                error={error}
              />
            )}
            {currentStep === 6 && (
              <StepStrategy
                formData={formData}
                updateForm={updateForm}
                onConfirm={handleSaveAndExit}
                isSaving={isSaving}
                onPrev={goPrev}
                stats={wizardStats!}
                error={error}
              />
            )}
          </div>

          <div className="hidden lg:block lg:col-span-5 xl:col-span-4">
            <LiveSummary formData={formData} stats={wizardStats!} currentStep={currentStep} />
          </div>
        </div>
      </div>
    </div>
  );
}
