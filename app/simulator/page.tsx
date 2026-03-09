'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import {
  formatCurrency,
  computeFinancialPlan,
  EMPTY_BUDGET_RESULT,
  analyzePurchaseImpact,
} from '@/app/lib/logic';
import { PurchaseType, PaymentMode } from '@/app/lib/definitions';
import { Save, RefreshCcw, Settings, Wallet, Target, TrendingDown } from 'lucide-react';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import PageLoader from '@/app/components/ui/PageLoader';
import { useToast } from '@/app/components/ui/Toast';
import Badge from '@/app/components/ui/Badge';
import ProfileEmptyPrompt from '@/app/components/ui/ProfileEmptyPrompt';
import BackLink from '@/app/components/ui/BackLink';
import { SimulatorForm, type PurchaseFormState } from '@/app/components/simulator/SimulatorForm';
import { PurchaseRecap } from '@/app/components/simulator/PurchaseRecap';
import { DiagnosticCard } from '@/app/components/simulator/DiagnosticCard';

export default function SimulatorPage() {
  const router = useRouter();
  const { profile, isLoaded, addDecision } = useFinancialData();
  const { showToast } = useToast();

  const stats = useMemo(() => {
    if (!profile) return EMPTY_BUDGET_RESULT;
    const plan = computeFinancialPlan(profile);
    return plan.budget;
  }, [profile]);

  const isProfileEmpty = stats.monthlyIncome === 0 && stats.matelas === 0;
  const [step, setStep] = useState<'input' | 'result'>('input');
  const [isSaving, setIsSaving] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const [purchase, setPurchase] = useState<PurchaseFormState>({
    name: '',
    type: PurchaseType.NEED,
    amount: '',
    date: today,
    paymentMode: PaymentMode.CASH_SAVINGS,
    duration: '',
    rate: '',
    isReimbursable: false,
    isPro: false,
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const result = useMemo(() => {
    if (step === 'result') {
      return analyzePurchaseImpact(stats, purchase, profile, profile?.decisions || []);
    }
    return null;
  }, [step, stats, purchase, profile]);

  const handleSavePurchase = async () => {
    if (!result) return;
    setIsSaving(true);
    try {
      const payload = {
        ...purchase,
        amount: parseFloat(purchase.amount),
        duration: purchase.duration ? parseInt(purchase.duration) : null,
        rate: purchase.rate ? parseFloat(purchase.rate) : null,
      };
      await addDecision(payload);
      setStep('input');
      setPurchase({
        name: '',
        type: PurchaseType.NEED,
        amount: '',
        date: today,
        paymentMode: PaymentMode.CASH_SAVINGS,
        duration: '',
        rate: '',
        isReimbursable: false,
        isPro: false,
      });
    } catch (error) {
      console.error('Erreur sauvegarde', error);
      showToast('Impossible de sauvegarder la décision.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded) return <PageLoader />;

  if (isProfileEmpty) {
    return (
      <ProfileEmptyPrompt
        variant="compact"
        title="Profil manquant"
        message="Pour simuler un achat, nous avons besoin de connaître ton budget."
        buttonLabel="Configurer mon Profil"
        onAction={() => router.push('/profile')}
        icon={Settings}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
      <div className="lg:col-span-7 xl:col-span-8 space-y-6">
        {step === 'input' && (
          <SimulatorForm
            purchase={purchase}
            setPurchase={setPurchase}
            onAnalyze={() => setStep('result')}
          />
        )}

        {step === 'result' && result && (
          <div className="space-y-6 animate-fade-in">
            <BackLink
              label="Modifier la saisie"
              onClick={() => setStep('input')}
              variant="indigo"
            />
            <PurchaseRecap purchase={purchase} />
            <DiagnosticCard result={result} />
          </div>
        )}
      </div>

      <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-6">
        <Card className="p-6 bg-white border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Wallet size={20} className="text-slate-400" /> Mon Contexte
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-500 text-sm font-medium">Revenus</span>
              <span className="font-bold text-slate-700">{formatCurrency(stats.monthlyIncome)}</span>
            </div>
            {stats.totalGoalsEffort > 0 && (
              <div className="flex justify-between items-center p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                <span className="text-emerald-700 text-sm font-bold flex items-center gap-2">
                  <Target size={14} /> Épargne Projets
                </span>
                <span className="font-bold text-emerald-700">
                  -{formatCurrency(stats.totalGoalsEffort)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
              <span className="text-indigo-900 text-sm font-bold">Reste à vivre</span>
              <span className="font-bold text-indigo-700 text-xl">
                {formatCurrency(stats.remainingToLive)}
              </span>
            </div>
          </div>
        </Card>

        {step === 'result' && result && (
          <div className="space-y-4 animate-fade-in">
            <Card className="p-6 border-indigo-100 shadow-md bg-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
              <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                <TrendingDown size={20} /> Impact Immédiat
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase mb-1">Nouveau Matelas</div>
                  <div className="flex justify-between items-end">
                    <div className="font-bold text-slate-800 text-2xl">
                      {formatCurrency(result.newMatelas)}
                    </div>
                    <Badge
                      color={
                        result.newSafetyMonths < 3 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                      }
                    >
                      {result.newSafetyMonths.toFixed(1)} mois sécu
                    </Badge>
                  </div>
                </div>
                <div className="h-px bg-slate-100"></div>
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase mb-1">
                    Nouveau Reste à Vivre
                  </div>
                  <div
                    className={`font-bold text-2xl ${result.newRV < 0 ? 'text-rose-600' : 'text-slate-800'}`}
                  >
                    {formatCurrency(result.newRV)}
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex flex-col gap-3">
              <Button onClick={handleSavePurchase} className="w-full shadow-xl" disabled={isSaving}>
                {isSaving ? '...' : (
                  <>
                    <Save size={18} /> Enregistrer la décision
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setStep('input')}
                className="w-full"
                disabled={isSaving}
              >
                <RefreshCcw size={18} /> Refaire un test
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
