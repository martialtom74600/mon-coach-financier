'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import { computeFinancialPlan, formatCurrency, simulateGoalScenario } from '@/app/lib/logic';
import { GoalCategory, Goal, GoalScenarioInput } from '@/app/lib/definitions';
import { Target, Plus, ArrowLeft, LayoutGrid } from 'lucide-react';
import Button from '@/app/components/ui/Button';
import { useToast } from '@/app/components/ui/Toast';
import ConfirmDialog from '@/app/components/ui/ConfirmDialog';
import PageLoader from '@/app/components/ui/PageLoader';
import ProfileEmptyPrompt from '@/app/components/ui/ProfileEmptyPrompt';
import { useConfirmDelete } from '@/app/hooks/useConfirmDelete';
import { GoalForm, type GoalFormData } from '@/app/components/goals/GoalForm';
import { GoalSimulation } from '@/app/components/goals/GoalSimulation';
import { GoalItemCard } from '@/app/components/goals/GoalItemCard';
import { GoalBudgetSidebar } from '@/app/components/goals/GoalBudgetSidebar';
import EmptyListState from '@/app/components/ui/EmptyListState';
import { applyStrategyToForm } from '@/app/components/goals/applyStrategyToForm';

export default function GoalsPage() {
  const { profile, isLoaded, saveGoal, deleteGoal } = useFinancialData();
  const { showToast } = useToast();
  const { state: confirmDelete, openConfirm, closeConfirm, wrapConfirm } = useConfirmDelete();

  const stats = useMemo(() => {
    if (!profile)
      return {
        monthlyIncome: 0,
        matelas: 0,
        goalsBreakdown: [],
        totalGoalsEffort: 0,
        availableForProjects: 0,
        capacityToSave: 0,
        securityBuffer: 0,
      };
    const plan = computeFinancialPlan(profile);
    return { ...plan.budget, goalsBreakdown: plan.allocations };
  }, [profile]);

  const isProfileEmpty = stats.monthlyIncome === 0 && stats.matelas === 0;
  const hasGoals = stats.goalsBreakdown && stats.goalsBreakdown.length > 0;

  const [step, setStep] = useState<'input' | 'list'>(hasGoals ? 'list' : 'input');
  const [inputStep, setInputStep] = useState<'form' | 'check'>('form');
  const [isSaving, setIsSaving] = useState(false);
  const [newGoal, setNewGoal] = useState<GoalFormData>({
    name: '',
    category: 'REAL_ESTATE',
    targetAmount: '',
    currentSaved: '',
    deadline: '',
    projectedYield: '',
    transferDay: '',
  });
  const [hasSavings, setHasSavings] = useState(false);
  const [isInvested, setIsInvested] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, inputStep]);

  useEffect(() => {
    if (!hasSavings) setNewGoal((prev) => ({ ...prev, currentSaved: '' }));
    if (!isInvested) setNewGoal((prev) => ({ ...prev, projectedYield: '' }));
  }, [hasSavings, isInvested]);

  const simulation = useMemo(() => {
    if (inputStep !== 'check') return null;
    const input: GoalScenarioInput = {
      name: newGoal.name,
      category: newGoal.category as GoalCategory,
      targetAmount: parseFloat(newGoal.targetAmount) || 0,
      currentSaved: parseFloat(newGoal.currentSaved) || 0,
      deadline: new Date(newGoal.deadline),
      projectedYield: parseFloat(newGoal.projectedYield) || 0,
      isInvested,
    };
    return simulateGoalScenario(input, profile, stats);
  }, [inputStep, newGoal, profile, stats, isInvested]);

  const displayedGoalsEffort =
    inputStep === 'check' && simulation ? stats.totalGoalsEffort + simulation.monthlyEffort : stats.totalGoalsEffort;
  const displayedRemaining = stats.availableForProjects - (inputStep === 'check' && simulation ? simulation.monthlyEffort : 0);
  const isBudgetNegative = displayedRemaining < 0;

  const handleApplyStrategy = (strategy: import('@/app/lib/definitions').GoalStrategy) => {
    const { updates, triggerSavings } = applyStrategyToForm(strategy, newGoal);
    setNewGoal({ ...newGoal, ...updates });
    if (triggerSavings) setHasSavings(true);
  };

  const handleSaveGoal = async () => {
    if (!simulation) return;
    setIsSaving(true);
    try {
      const payload: Partial<Goal> = {
        name: newGoal.name,
        category: newGoal.category as GoalCategory,
        targetAmount: parseFloat(newGoal.targetAmount),
        currentSaved: parseFloat(newGoal.currentSaved || '0'),
        monthlyContribution: simulation.monthlyEffort,
        deadline: new Date(newGoal.deadline),
        projectedYield: parseFloat(newGoal.projectedYield || '0'),
        transferDay: newGoal.transferDay ? parseInt(newGoal.transferDay) : null,
      };
      await saveGoal(payload);
      setStep('list');
      setInputStep('form');
      setNewGoal({
        name: '',
        category: 'REAL_ESTATE',
        targetAmount: '',
        currentSaved: '',
        deadline: '',
        projectedYield: '',
        transferDay: '',
      });
    } catch (error) {
      console.error("Erreur sauvegarde objectif", error);
      showToast("Oups, on n'a pas pu sauvegarder. Tu réessaies ?");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGoal = (id: string) => openConfirm(id);

  const handleConfirmDelete = wrapConfirm(async (id) => {
    try {
      await deleteGoal(id);
    } catch (e) {
      console.error(e);
      showToast('Oups, la suppression a coincé. Tu réessaies ?');
    }
  });

  if (!isLoaded) return <PageLoader />;
  if (isProfileEmpty) {
    return <ProfileEmptyPrompt variant="minimal" message="Profil manquant..." />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in pb-20">
      <div className="lg:col-span-7 xl:col-span-8 space-y-6">
        <div className="mb-2 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Target className="text-emerald-600" /> {step === 'list' ? 'Tes objectifs' : 'Nouveau Projet'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {step === 'input' && inputStep === 'check'
                ? 'On calcule...'
                : 'Planifie où tu veux aller.'}
            </p>
          </div>
          {step === 'list' && (
            <Button
              size="sm"
              onClick={() => {
                setStep('input');
                setInputStep('form');
              }}
              className="shadow-lg bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus size={16} /> Nouveau
            </Button>
          )}
        </div>

        {step === 'input' && inputStep === 'form' && (
          <GoalForm
            formData={newGoal}
            setFormData={setNewGoal}
            hasSavings={hasSavings}
            setHasSavings={setHasSavings}
            isInvested={isInvested}
            setIsInvested={setIsInvested}
            onSimulate={() => setInputStep('check')}
            hasGoals={hasGoals}
            onBackToList={() => setStep('list')}
          />
        )}

        {step === 'input' && inputStep === 'check' && simulation && (
          <GoalSimulation
            simulation={simulation}
            formData={newGoal}
            setFormData={setNewGoal}
            onApplyStrategy={handleApplyStrategy}
            onSave={handleSaveGoal}
            onBack={() => setInputStep('form')}
            isSaving={isSaving}
          />
        )}

        {step === 'list' && (
          <div className="space-y-4 animate-fade-in">
            {!hasGoals ? (
              <EmptyListState
                variant="compact"
                icon={LayoutGrid}
                message="Aucun objectif pour l'instant."
                buttonLabel="Créer mon premier objectif"
                onAction={() => {
                  setStep('input');
                  setInputStep('form');
                }}
              />
            ) : (
              (profile?.goals || []).map((goal: Goal) => (
                <GoalItemCard key={goal.id} goal={goal} onDelete={handleDeleteGoal} />
              ))
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete.open}
        title="Supprimer cet objectif ?"
        message="C'est définitif."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={closeConfirm}
      />
      <GoalBudgetSidebar
        monthlyIncome={stats.monthlyIncome}
        capacityToSave={stats.capacityToSave}
        securityBuffer={stats.securityBuffer}
        matelas={stats.matelas}
        totalGoalsEffort={stats.totalGoalsEffort}
        displayedGoalsEffort={displayedGoalsEffort}
        displayedRemaining={displayedRemaining}
        isBudgetNegative={isBudgetNegative}
      />
    </div>
  );
}
