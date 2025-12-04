'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import {
  analyzePurchaseImpact,
  formatCurrency,
  PURCHASE_TYPES,
  PAYMENT_MODES,
  generateId,
  calculateFinancials,
} from '@/app/lib/logic';

import {
  CheckCircle, AlertTriangle, XCircle, Info, Wallet, TrendingDown,
  ArrowLeft, Save, RefreshCcw, Settings, Briefcase, RefreshCw,
  CalendarDays, Target, ShoppingBag
} from 'lucide-react';

import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import InputGroup from '@/app/components/ui/InputGroup';
import Badge from '@/app/components/ui/Badge';

// --- COMPOSANTS UI LOCAUX ---

const ContextToggle = ({ label, subLabel, icon: Icon, checked, onChange }: any) => (
  <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all duration-200 ${checked ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
    <div className={`p-2 rounded-lg ${checked ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
      <Icon size={20} />
    </div>
    <div className="flex-1">
      <div className={`font-bold text-sm ${checked ? 'text-indigo-900' : 'text-slate-700'}`}>{label}</div>
      <div className="text-xs text-slate-500 mt-0.5">{subLabel}</div>
    </div>
    <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${checked ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
      {checked && <CheckCircle size={14} className="text-white" />}
    </div>
    <input type="checkbox" className="hidden" checked={checked} onChange={(e) => onChange(e.target.checked)} />
  </label>
);

const PurchaseRecap = ({ purchase }: { purchase: any }) => {
  const typeKey = purchase.type.toUpperCase();
  // @ts-ignore
  const typeInfo = PURCHASE_TYPES[typeKey] || { label: purchase.type, color: 'bg-gray-100 text-gray-600' };
  // @ts-ignore
  const paymentLabel = PAYMENT_MODES[purchase.paymentMode] || purchase.paymentMode;

  return (
      <Card className="p-5 border-slate-200 bg-white">
          <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                  <ShoppingBag size={24} />
              </div>
              <div>
                  <h3 className="text-lg font-bold text-slate-800">{purchase.name}</h3>
                  <div className="text-sm text-slate-500">{formatCurrency(purchase.amount)} • {paymentLabel}</div>
              </div>
          </div>
      </Card>
  )
};

const DiagnosticCard = ({ result }: { result: any }) => {
  if (!result) return null;
  const theme = {
    green: { bg: 'bg-emerald-600', icon: CheckCircle },
    orange: { bg: 'bg-amber-500', icon: AlertTriangle },
    red: { bg: 'bg-rose-600', icon: XCircle },
  }[result.verdict as 'green' | 'orange' | 'red'];
  const MainIcon = theme.icon;

  const getStatusBadge = (isOk: boolean) => 
    isOk 
      ? <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md border border-emerald-200"><CheckCircle size={12}/> Validé</span>
      : <span className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded-md border border-rose-200"><XCircle size={12}/> Risqué</span>;

  return (
    <Card className="overflow-hidden shadow-xl border-slate-100 p-0 animate-fade-in">
       <div className={`${theme.bg} p-6 text-white relative overflow-hidden`}>
         <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
         <div className="relative z-10 flex items-start gap-4">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md shrink-0">
              <MainIcon size={32} />
            </div>
            <div>
               <h2 className="text-xl font-bold">{result.smartTitle}</h2>
               <p className="text-white/90 text-sm font-medium opacity-95 leading-relaxed">{result.smartMessage}</p>
            </div>
         </div>
       </div>

      <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/50">
        <div className="p-5 flex flex-col gap-2">
           <div className="flex justify-between items-start">
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Moyens Théoriques</div>
             {getStatusBadge(result.isBudgetOk)}
           </div>
           <div>
             <div className="text-sm font-bold text-slate-800">Budget Mensuel</div>
             <p className="text-xs text-slate-500 mt-1 leading-snug">
               {result.isBudgetOk 
                 ? "Cet achat rentre dans ton niveau de vie global." 
                 : "Attention, tu vis au-dessus de tes revenus ce mois-ci."}
             </p>
           </div>
        </div>

        <div className="p-5 flex flex-col gap-2">
           <div className="flex justify-between items-start">
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Réalité Compte</div>
             {getStatusBadge(result.isCashflowOk)}
           </div>
           <div>
             <div className="text-sm font-bold text-slate-800">Trésorerie J+45</div>
             <p className="text-xs text-slate-500 mt-1 leading-snug">
               {result.isCashflowOk 
                 ? "Aucun découvert prévu sur les 45 prochains jours." 
                 : `Risque de découvert (Min: ${formatCurrency(result.lowestProjectedBalance)}).`}
             </p>
           </div>
        </div>
      </div>

      {result.tips.length > 0 && (
        <div className="p-5 bg-white space-y-3">
             {result.tips.map((tip: any, i: number) => (
                <div key={i} className="flex gap-3 text-sm text-slate-600 items-start">
                   <div className="mt-0.5 text-indigo-500 shrink-0"><Info size={16} /></div>
                   <div className="leading-relaxed">{tip.text}</div>
                </div>
             ))}
        </div>
      )}
      
      {result.issues.length > 0 && (
          <div className="px-5 pb-4 bg-white">
            <div className="pt-4 border-t border-slate-100">
               <p className="text-xs font-bold text-slate-400 mb-2">Points d&apos;attention :</p>
               {result.issues.map((issue: any, i: number) => (
                 <div key={i} className="text-xs font-medium text-slate-500 flex gap-2 items-center mb-1">
                   <div className={`w-1.5 h-1.5 rounded-full ${issue.level === 'red' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                   {issue.text}
                 </div>
               ))}
            </div>
          </div>
      )}
    </Card>
  );
};

// ============================================================================
// PAGE PRINCIPALE
// ============================================================================

export default function SimulatorPage() {
  const router = useRouter();
  const { profile, history, saveDecision, isLoaded } = useFinancialData();
  
  // Utilise l'engine v2 pour calculer les stats (incluant le fix des goals)
  const stats = useMemo(() => calculateFinancials(profile), [profile]);
  
  const isProfileEmpty = stats.monthlyIncome === 0 && stats.matelas === 0;
  const [step, setStep] = useState<'input' | 'result'>('input');
  const [isSaving, setIsSaving] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  // State Achat (Unique focus de cette page)
  const [purchase, setPurchase] = useState({
    name: '',
    type: 'need',
    amount: '',
    date: today,
    paymentMode: 'CASH_SAVINGS',
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
      return analyzePurchaseImpact(stats, purchase, profile, history);
    }
    return null;
  }, [step, stats, purchase, profile, history]);

  const handleSavePurchase = async () => {
    if (!result) return;
    setIsSaving(true);
    // Simulation d'attente pour l'UX
    await new Promise(resolve => setTimeout(resolve, 600));

    const decision = {
      id: generateId(),
      date: new Date().toISOString(),
      purchase,
      result,
    };
    
    saveDecision(decision);
    setStep('input');
    setPurchase({
      name: '',
      type: 'need',
      amount: '',
      date: today,
      paymentMode: 'CASH_SAVINGS',
      duration: '',
      rate: '',
      isReimbursable: false,
      isPro: false,
    });
    setIsSaving(false);
  };

  if (!isLoaded) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-pulse h-12 w-12 bg-slate-200 rounded-full"></div></div>;

  if (isProfileEmpty) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-6"><Settings size={48} /></div>
        <h2 className="text-2xl font-bold text-slate-800 mb-3">Profil manquant</h2>
        <p className="text-slate-500 max-w-md mb-8">Pour simuler un achat, nous avons besoin de connaître ton budget.</p>
        <Button onClick={() => router.push('/profile')}>Configurer mon Profil</Button>
      </div>
    );
  }

  const dateLabel = (purchase.paymentMode === 'SPLIT' || purchase.paymentMode === 'CREDIT') 
    ? "Date de la 1ère échéance" 
    : "Date de l'achat";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
      
      {/* --- COLONNE GAUCHE (FORMULAIRE) --- */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-6">
        
        {/* TITRE SIMPLE */}
        {step === 'input' && (
              <div className="mb-2">
                  <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                      <ShoppingBag className="text-indigo-600"/> Simulateur d'Achat
                  </h1>
                  <p className="text-slate-500 text-sm mt-1">Est-ce que cet achat rentre dans ton budget sans casser tes objectifs ?</p>
              </div>
        )}

        {/* --- FORMULAIRE ACHAT --- */}
        {step === 'input' && (
          <Card className="p-6 md:p-8">
            <div className="space-y-6">
              <InputGroup label="C'est quoi ?" placeholder="iPhone, Réparation..." value={purchase.name} onChange={(v: string) => setPurchase({ ...purchase, name: v })} />
              
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Quel type d&apos;achat ?</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {Object.values(PURCHASE_TYPES).map((type: any) => (
                    <button key={type.id} onClick={() => setPurchase({ ...purchase, type: type.id })} className={`p-3 rounded-lg text-sm font-medium border-2 transition-all text-left sm:text-center group ${purchase.type === type.id ? type.color : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}>
                      <div className="font-bold mb-1">{type.label}</div>
                      <div className="text-xs opacity-70 font-normal hidden sm:block">{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputGroup label="Montant total" type="number" placeholder="0" suffix="€" value={purchase.amount} onChange={(v: string) => setPurchase({ ...purchase, amount: v })} />
                  <InputGroup label={dateLabel} type="date" value={purchase.date} onChange={(v: string) => setPurchase({ ...purchase, date: v })} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Comment tu paies ?</label>
                <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500" value={purchase.paymentMode} onChange={(e) => setPurchase({ ...purchase, paymentMode: e.target.value })}>
                  {Object.entries(PAYMENT_MODES).map(([key, label]: any) => <option key={key} value={key}>{label}</option>)}
                </select>
              </div>
              
              {(purchase.paymentMode === 'SPLIT' || purchase.paymentMode === 'CREDIT') && (
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-4 animate-fade-in">
                  <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2"><CalendarDays size={16} /> Détails de l&apos;échéancier</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputGroup label="Durée (mois)" type="number" value={purchase.duration} onChange={(v: string) => setPurchase({ ...purchase, duration: v })} />
                    {purchase.paymentMode === 'CREDIT' && <InputGroup label="Taux (%)" type="number" value={purchase.rate} onChange={(v: string) => setPurchase({ ...purchase, rate: v })} />}
                  </div>
                </div>
              )}
              
              <div className="pt-2 space-y-3">
                <label className="block text-sm font-medium text-slate-600">Contexte particulier (optionnel)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ContextToggle label="Avance / Remboursable" subLabel="Je serai remboursé" icon={RefreshCw} checked={purchase.isReimbursable} onChange={(v: boolean) => setPurchase({ ...purchase, isReimbursable: v })} />
                    <ContextToggle label="Investissement / Pro" subLabel="Ça va me rapporter de l'argent" icon={Briefcase} checked={purchase.isPro} onChange={(v: boolean) => setPurchase({ ...purchase, isPro: v })} />
                </div>
              </div>
              
              <div className="pt-4">
                <Button onClick={() => setStep('result')} className="w-full md:w-auto md:px-8" disabled={!purchase.amount || !purchase.name}>Analyser l&apos;achat</Button>
              </div>
            </div>
          </Card>
        )}

        {/* --- RÉSULTAT --- */}
        {step === 'result' && result && (
          <div className="space-y-6 animate-fade-in">
            <button onClick={() => setStep('input')} className="text-slate-500 flex items-center gap-1 text-sm font-medium hover:text-indigo-600 transition-colors">
              <ArrowLeft size={16} /> Modifier la saisie
            </button>
            <PurchaseRecap purchase={purchase} />
            <DiagnosticCard result={result} />
          </div>
        )}
      </div>

      {/* --- COLONNE DROITE (CONTEXTE FINANCIER) --- */}
      <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-6">
        
        {/* Rappel du contexte */}
        <Card className="p-6 bg-white border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Wallet size={20} className="text-slate-400" /> Mon Contexte
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 text-sm font-medium">Revenus</span>
                {/* DYNAMIQUE */}
                <span className="font-bold text-slate-700">{formatCurrency(stats.monthlyIncome)}</span>
            </div>
            
            {/* DYNAMIQUE : N'apparait que si totalGoalsEffort > 0 (ce qui dépend de tes goals et du buffer engine) */}
            {stats.totalGoalsEffort > 0 && (
                <div className="flex justify-between items-center p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <span className="text-emerald-700 text-sm font-bold flex items-center gap-2"><Target size={14}/> Épargne Projets</span>
                    <span className="font-bold text-emerald-700">-{formatCurrency(stats.totalGoalsEffort)}</span>
                </div>
            )}

            <div className="flex justify-between items-center p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <span className="text-indigo-900 text-sm font-bold">Reste à vivre</span>
                {/* DYNAMIQUE : Vient directement de engine.ts (contient le buffer invisible) */}
                <span className="font-bold text-indigo-700 text-xl">{formatCurrency(stats.remainingToLive)}</span>
            </div>
          </div>
        </Card>

        {/* --- BLOC D'IMPACT (Seulement en mode Resultat) --- */}
        {step === 'result' && result && (
          <div className="space-y-4 animate-fade-in">
            <Card className="p-6 border-indigo-100 shadow-md bg-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
              <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2"><TrendingDown size={20} /> Impact Immédiat</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase mb-1">Nouveau Matelas</div>
                  <div className="flex justify-between items-end">
                    {/* DYNAMIQUE : Calculé par analyzePurchaseImpact */}
                    <div className="font-bold text-slate-800 text-2xl">{formatCurrency(result.newMatelas)}</div>
                    <Badge color={result.newSafetyMonths < 3 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}>
                        {result.newSafetyMonths.toFixed(1)} mois sécu
                    </Badge>
                  </div>
                </div>
                <div className="h-px bg-slate-100"></div>
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase mb-1">Nouveau Reste à Vivre</div>
                  <div className={`font-bold text-2xl ${result.newRV < 0 ? 'text-rose-600' : 'text-slate-800'}`}>{formatCurrency(result.newRV)}</div>
                </div>
              </div>
            </Card>

            {/* MINI GRAPH DYNAMIQUE */}
            {result.projectedCurve && result.projectedCurve.length > 0 && (
              <Card className="p-4 border-slate-200 bg-white overflow-hidden">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Projection 30 Jours</h3>
                <div className="flex items-end gap-1 h-16 w-full">
                  {result.projectedCurve.map((point: any, i: number) => {
                    const isNegative = point.value < 0;
                    const heightPercent = Math.min(100, Math.max(5, (Math.abs(point.value) / (stats.monthlyIncome || 1000)) * 50));
                    return (
                      <div key={i} className="flex-1 flex flex-col justify-end h-full group relative">
                          <div 
                            className={`w-full rounded-t-sm transition-all ${isNegative ? 'bg-rose-400' : 'bg-emerald-300 group-hover:bg-emerald-400'}`} 
                            style={{ height: `${heightPercent}%` }}
                          ></div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-[10px] text-center text-slate-400">
                    Vision de ton compte si tu achètes
                </div>
              </Card>
            )}

            <div className="flex flex-col gap-3">
              <Button onClick={handleSavePurchase} className="w-full shadow-xl" disabled={isSaving}>{isSaving ? "..." : <><Save size={18} /> Enregistrer la décision</>}</Button>
              <Button variant="secondary" onClick={() => setStep('input')} className="w-full" disabled={isSaving}><RefreshCcw size={18} /> Refaire un test</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}