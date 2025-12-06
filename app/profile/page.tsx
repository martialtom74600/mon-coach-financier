'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import {
  calculateFinancials,
  formatCurrency,
  generateId,
  PERSONA_PRESETS
} from '@/app/lib/logic';

import AccordionSection from '@/app/components/AccordionSection';
import FinancialDoctor from '@/app/components/FinancialDoctor';

import {
  Save, Wallet, Tv, Landmark,
  User, Briefcase, GraduationCap, Armchair, Baby, Minus, CheckCircle,
  Search, Info, CreditCard, PiggyBank, ArrowRight, ChevronLeft,
  Zap, Shield, Plus, XCircle, Loader2,
  TrendingUp, Target, ShoppingCart, Coffee
} from 'lucide-react';

import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import InputGroup from '@/app/components/ui/InputGroup';

// --- UTILITAIRE DE PARSING ROBUSTE ---
const parseNumber = (value: any): number => {
  if (!value) return 0;
  const str = value.toString().replace(/\s/g, '').replace(',', '.');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

// --- CONFIGURATION ---
const STEPS = [
  { id: 1, label: "Profil", icon: User },      
  { id: 2, label: "Budget", icon: Wallet },    
  { id: 3, label: "Patrimoine", icon: Shield },
  { id: 4, label: "Lifestyle", icon: Zap },    
];

// --- COMPOSANTS UI ---
const InfoBox = ({ children, className = "mb-6" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex gap-3 text-xs text-indigo-800 ${className}`}>
    <Info size={16} className="shrink-0 mt-0.5 text-indigo-500" />
    <div className="leading-relaxed opacity-90 font-medium">{children}</div>
  </div>
);

const HouseholdCounter = ({ label, value, onChange, icon: Icon }: any) => (
  <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200">
    <div className="flex items-center gap-2 ml-2"><Icon size={16} className="text-slate-400" /><span className="font-medium text-slate-700 text-sm">{label}</span></div>
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(Math.max(0, value - 1))} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"><Minus size={12} /></button>
      <span className="font-bold text-slate-800 w-4 text-center text-sm">{value}</span>
      <button onClick={() => onChange(value + 1)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"><Plus size={12} /></button>
    </div>
  </div>
);

const PersonaSelector = ({ currentPersona, onChange }: any) => {
  const icons: any = { salaried: Briefcase, student: GraduationCap, freelance: Target, retired: Armchair, unemployed: Search };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Object.entries(PERSONA_PRESETS).map(([key, persona]: any) => {
        const Icon = icons[persona.id] || User;
        const isSelected = currentPersona === persona.id;
        return (
          <button key={key} onClick={() => onChange(persona.id)} className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${isSelected ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 bg-white hover:border-indigo-200'}`}>
            <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}><Icon size={18} /></div>
            <div><div className={`font-bold text-sm ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{persona.label}</div></div>
          </button>
        );
      })}
    </div>
  );
};

// --- MODALE CONFIRMATION ---
const ConfirmationModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center"><AlertTriangle size={24} /></div>
          <div><h3 className="text-lg font-bold text-slate-900">Quitter sans sauvegarder ?</h3><p className="text-sm text-slate-500">Tes modifications seront perdues.</p></div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={onClose} className="justify-center border-slate-200 text-slate-600 hover:bg-slate-50">Rester</Button>
            <Button onClick={onConfirm} className="justify-center bg-rose-600 hover:bg-rose-700 text-white">Quitter</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PAGE PRINCIPALE
// ============================================================================

export default function ProfilePage() {
  const { profile, saveProfile, isLoaded } = useFinancialData();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  
  // ÉTATS
  const [formData, setFormData] = useState<any>(null);
  const [initialDataStr, setInitialDataStr] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  
  // SWITCH
  const [showInvestments, setShowInvestments] = useState(false);
  const isSavingRef = useRef(false); 

  // 1. INITIALISATION
  useEffect(() => {
    if (isLoaded && profile && !formData) {
        const cleanProfile = JSON.parse(JSON.stringify(profile));
        
        // Sécurisation des tableaux
        if (!cleanProfile.incomes) cleanProfile.incomes = [];
        if (!cleanProfile.fixedCosts) cleanProfile.fixedCosts = [];
        if (!cleanProfile.credits) cleanProfile.credits = [];
        if (!cleanProfile.subscriptions) cleanProfile.subscriptions = [];
        if (!cleanProfile.annualExpenses) cleanProfile.annualExpenses = [];
        if (!cleanProfile.savingsContributions) cleanProfile.savingsContributions = [];

        // Séparation Variable : Si variableCosts existe mais pas food/fun, on initialise
        if (!cleanProfile.foodBudget) cleanProfile.foodBudget = Math.round(cleanProfile.variableCosts * 0.6) || 0;
        if (!cleanProfile.funBudget) cleanProfile.funBudget = Math.round(cleanProfile.variableCosts * 0.4) || 0;

        // Mode
        if (cleanProfile.mode === 'beginner') {
             cleanProfile.investments = 0;
             cleanProfile.investmentYield = 0;
             cleanProfile.savingsContributions = [];
             setShowInvestments(false);
        } else if (cleanProfile.mode === 'expert') {
             setShowInvestments(true);
        } else {
             const hasMoney = cleanProfile.investments > 0;
             const hasContrib = cleanProfile.savingsContributions.length > 0;
             setShowInvestments(hasMoney || hasContrib);
        }

        setFormData(cleanProfile);
        setInitialDataStr(JSON.stringify(cleanProfile));
    }
  }, [isLoaded, profile]);

  const hasChanges = useMemo(() => {
    if (!formData || !initialDataStr) return false;
    return JSON.stringify(formData) !== initialDataStr;
  }, [formData, initialDataStr]);

  // PROTECTION QUITTER
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => { 
        if (hasChanges && !isSavingRef.current) { 
            e.preventDefault(); 
            e.returnValue = ''; 
        } 
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // 2. STATS (Calculées à la volée)
  const stats = useMemo(() => {
    if (!formData) return null;
    // On recompose le variable total pour le moteur
    const engineData = { 
        ...formData, 
        variableCosts: parseNumber(formData.foodBudget) + parseNumber(formData.funBudget)
    };
    return calculateFinancials(engineData);
  }, [formData]);

  if (!isLoaded || !formData || !stats) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-pulse h-12 w-12 bg-slate-200 rounded-full"></div></div>;

  const updateForm = (newData: any) => setFormData(newData);
  
  // 3. SWITCH (Visuel)
  const toggleInvestments = () => {
      const willBeOn = !showInvestments;
      setShowInvestments(willBeOn);
      
      setFormData((prev: any) => {
          if (!willBeOn) {
             return { ...prev, investments: 0, investmentYield: 0, savingsContributions: [] };
          }
          return prev; 
      });
  };

  // 4. SAUVEGARDE
  const handleSaveAndExit = async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    isSavingRef.current = true;

    try {
      // On consolide le variable
      const finalData = { 
          ...formData,
          variableCosts: parseNumber(formData.foodBudget) + parseNumber(formData.funBudget),
          balanceDate: new Date().toISOString()
      };

      if (showInvestments) {
          finalData.mode = 'expert';
          finalData.investments = parseNumber(finalData.investments);
          finalData.investmentYield = parseNumber(finalData.investmentYield);
      } else {
          finalData.mode = 'beginner';
          finalData.investments = 0;
          finalData.investmentYield = 0;
          finalData.savingsContributions = [];
      }

      await saveProfile(finalData, true);
      window.location.href = '/'; 

    } catch (error) { 
        console.error("Erreur Save:", error);
        setIsSaving(false); 
        isSavingRef.current = false;
        alert("Erreur de connexion lors de la sauvegarde."); 
    }
  };

  const handleCancelRequest = () => { hasChanges ? setShowExitModal(true) : router.push('/'); };
  const confirmExit = () => { setShowExitModal(false); router.push('/'); };
  const goNext = () => { currentStep < 4 ? (setCurrentStep(currentStep + 1), window.scrollTo(0,0)) : handleSaveAndExit(); };
  const goPrev = () => setCurrentStep(Math.max(1, currentStep - 1));

  // CRUD HELPERS
  const updateItem = (listName: string, id: string, field: string, value: any) => {
    const list = (formData as any)[listName] || [];
    const newList = list.map((item: any) => item.id === id ? { ...item, [field]: value } : item);
    updateForm({ ...formData, [listName]: newList });
  };
  const addItem = (listName: string) => {
    const isAnnual = listName === 'annualExpenses';
    const newItem = { id: generateId(), name: '', amount: '', frequency: isAnnual ? 'annuel' : 'mensuel', dayOfMonth: 5 };
    const currentList = (formData as any)[listName] || [];
    updateForm({ ...formData, [listName]: [...currentList, newItem] });
  };
  const removeItem = (listName: string, id: string) => {
    const list = (formData as any)[listName] || [];
    const newList = list.filter((item: any) => item.id !== id);
    updateForm({ ...formData, [listName]: newList });
  };

  return (
    <>
      <ConfirmationModal isOpen={showExitModal} onClose={() => setShowExitModal(false)} onConfirm={confirmExit} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in pb-24">
        
        {/* HEADER */}
        <div className="lg:col-span-12 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
              <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    {currentStep === 1 && "Faisons connaissance"}
                    {currentStep === 2 && "Ton Moteur Financier"}
                    {currentStep === 3 && "Ta Photo Patrimoniale"}
                    {currentStep === 4 && "L'Arbitrage Final"}
                  </h1>
                  <p className="text-sm text-slate-500 font-medium">Étape {currentStep} sur 4</p>
              </div>
          </div>
          {/* PROGRESS BAR */}
          <div className="flex items-center justify-between relative px-4 md:px-12">
              <div className="absolute left-6 right-6 top-5 h-1 bg-slate-100 -z-0 rounded-full">
                  <div className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out" style={{ width: `${((currentStep - 1) / 3) * 100}%` }}></div>
              </div>
              {STEPS.map((step) => {
                  const isActive = step.id === currentStep;
                  const isDone = step.id < currentStep;
                  const StepIcon = step.icon;
                  return (
                      <button key={step.id} onClick={() => setCurrentStep(step.id)} className="relative z-10 flex flex-col items-center group focus:outline-none">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${isActive ? 'bg-indigo-600 border-white ring-4 ring-indigo-100 text-white shadow-lg scale-110' : isDone ? 'bg-indigo-600 border-white text-white' : 'bg-white border-slate-100 text-slate-300 hover:border-indigo-200'}`}>
                              {isDone ? <CheckCircle size={16} /> : <StepIcon size={16} />}
                          </div>
                          <span className={`mt-3 text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-indigo-600' : isDone ? 'text-indigo-600' : 'text-slate-300'}`}>{step.label}</span>
                      </button>
                  );
              })}
          </div>
        </div>

        {/* SIDEBAR SYNTHÈSE */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6 order-first lg:order-last hidden md:block">
           <div className={`bg-white border transition-colors duration-300 rounded-2xl p-6 shadow-sm relative overflow-hidden ${hasChanges ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Synthèse</h2>
              {hasChanges ? <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold animate-pulse">Non sauvegardé</span> : <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-bold">À jour</span>}
            </div>
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center mb-4"><div className="flex items-center gap-2 text-emerald-600 text-sm font-bold"><Wallet size={18} /> Revenus</div><span className="font-bold text-lg text-emerald-600">{formatCurrency(stats.monthlyIncome)}</span></div>
              <div className="space-y-2 pl-2 border-l-2 border-slate-100">
                  <div className="flex justify-between items-center text-sm"><div className="flex items-center gap-2 text-slate-500">Charges Fixes</div><span className="font-medium text-slate-700">- {formatCurrency(stats.mandatoryExpenses)}</span></div>
                  <div className="flex justify-between items-center text-sm"><div className="flex items-center gap-2 text-slate-500">Vie Courante</div><span className="font-medium text-slate-700">- {formatCurrency(stats.discretionaryExpenses)}</span></div>
              </div>
              <div className="h-px bg-slate-100 my-4"></div>
              <div className="flex justify-between items-end"><div className="text-sm text-slate-400">Cashflow</div><div className={`text-2xl font-black tracking-tight ${stats.realCashflow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{stats.realCashflow > 0 ? '+' : ''}{formatCurrency(stats.realCashflow)}</div></div>
            </div>
          </div>
          <div className="hidden lg:block space-y-3">
            <Button onClick={(e) => handleSaveAndExit(e)} disabled={isSaving} type="button" className={`w-full ${hasChanges ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {isSaving ? '...' : 'Sauvegarder'}
            </Button>
            <Button variant="outline" onClick={handleCancelRequest} type="button" className="w-full bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-rose-600 hover:border-rose-200"><XCircle size={18} /> Annuler</Button>
          </div>
        </div>

        {/* CONTENU PRINCIPAL */}
        <div className="lg:col-span-8 space-y-8 min-h-[50vh]">
          
          {/* --- ACTE 1 : IDENTITÉ --- */}
          {currentStep === 1 && (
              <div className="space-y-6 animate-slide-up">
                  <InfoBox>On commence soft. Juste les bases pour que le coach sache à qui il parle.</InfoBox>
                  <Card className="p-6">
                      <div className="space-y-6">
                          <InputGroup label="Ton Prénom" placeholder="Tom" value={formData.firstName || ''} onChange={(val: string) => updateForm({ ...formData, firstName: val })} />
                          <div><label className="block text-sm font-medium text-slate-600 mb-2">Ta situation</label><PersonaSelector currentPersona={formData.persona || 'salaried'} onChange={(id: string) => updateForm({ ...formData, persona: id })} /></div>
                          <div><label className="block text-sm font-medium text-slate-600 mb-2">Ton foyer</label><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><HouseholdCounter label="Adultes" icon={User} value={parseInt(formData.household?.adults) || 1} onChange={(v: number) => updateForm({ ...formData, household: { ...formData.household, adults: v } })} /><HouseholdCounter label="Enfants" icon={Baby} value={parseInt(formData.household?.children) || 0} onChange={(v: number) => updateForm({ ...formData, household: { ...formData.household, children: v } })} /></div></div>
                      </div>
                  </Card>
              </div>
          )}

          {/* --- ACTE 2 : LE FLUX --- */}
          {currentStep === 2 && (
              <div className="space-y-6 animate-slide-up">
                  <InfoBox>Indique ici tout ce qui rentre et tout ce qui part (obligatoirement) chaque mois.</InfoBox>
                  <AccordionSection mode={formData.mode} defaultOpen={true} title="Revenus Mensuels (Net)" icon={Wallet} colorClass="text-emerald-600" items={formData.incomes} onItemChange={(id, f, v) => updateItem('incomes', id, f, v)} onItemAdd={() => addItem('incomes')} onItemRemove={(id) => removeItem('incomes', id)} description="Salaires, Primes, Aides, Rentes..." />
                  <AccordionSection mode={formData.mode} defaultOpen={false} title="Charges Fixes (Loyer, Factures...)" icon={CreditCard} colorClass="text-slate-600" items={formData.fixedCosts} onItemChange={(id, f, v) => updateItem('fixedCosts', id, f, v)} onItemAdd={() => addItem('fixedCosts')} onItemRemove={(id) => removeItem('fixedCosts', id)} description="Loyer, Crédit Immo, Électricité, Assurances..." />
                  <AccordionSection mode={formData.mode} defaultOpen={false} title="Crédits Conso / Dettes" icon={Landmark} colorClass="text-orange-600" items={formData.credits} onItemChange={(id, f, v) => updateItem('credits', id, f, v)} onItemAdd={() => addItem('credits')} onItemRemove={(id) => removeItem('credits', id)} description="Crédit Auto, Paiements en plusieurs fois..." />
                  <AccordionSection mode={formData.mode} defaultOpen={false} title="Abonnements" icon={Tv} colorClass="text-purple-600" type="simple" items={formData.subscriptions} onItemChange={(id, f, v) => updateItem('subscriptions', id, f, v)} onItemAdd={() => addItem('subscriptions')} onItemRemove={(id) => removeItem('subscriptions', id)} description="Netflix, Spotify, Salle de sport..." />
              </div>
          )}

          {/* --- ACTE 3 : LE PATRIMOINE --- */}
          {currentStep === 3 && (
              <div className="space-y-6 animate-slide-up">
                  <div className="flex justify-between items-end"><h2 className="text-lg font-bold text-slate-800">Photo à l&apos;instant T</h2></div>
                  
                  {/* 1. LE CASH */}
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-4`}>
                      <Card className="p-6 border-l-4 border-l-indigo-500">
                          <div className="flex items-center gap-2 mb-4"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><CreditCard size={20} /></div><h3 className="font-bold text-slate-800">Compte Courant</h3></div>
                          <div className="relative"><input type="text" value={formData.currentBalance} onChange={(e) => updateForm({ ...formData, currentBalance: parseNumber(e.target.value) })} className="w-full text-2xl font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 pl-4 focus:border-indigo-500 outline-none transition-all" placeholder="0" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span></div>
                      </Card>
                      <Card className="p-6 border-l-4 border-l-emerald-500">
                          <div className="flex items-center gap-2 mb-4"><div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Shield size={20} /></div><h3 className="font-bold text-slate-800">Épargne Dispo</h3></div>
                          <div className="relative"><input type="text" value={formData.savings} onChange={(e) => updateForm({ ...formData, savings: parseNumber(e.target.value) })} className="w-full text-2xl font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 pl-4 focus:border-emerald-500 outline-none transition-all" placeholder="0" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span></div>
                      </Card>
                  </div>

                  <div className="h-px bg-slate-100 my-4"></div>

                  {/* 2. LE SWITCH INVESTISSEMENT */}
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                      <div className="flex items-center justify-between cursor-pointer" onClick={toggleInvestments}>
                          <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${showInvestments ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-500'}`}><TrendingUp size={20} /></div>
                              <div>
                                  <h3 className="font-bold text-slate-800">As-tu des placements financiers ?</h3>
                                  <p className="text-xs text-slate-500">Bourse, Crypto, Immobilier... ou Épargne mensuelle programmée</p>
                              </div>
                          </div>
                          <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${showInvestments ? 'bg-purple-600' : 'bg-slate-300'}`}>
                              <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${showInvestments ? 'translate-x-6' : 'translate-x-0'}`}></div>
                          </div>
                      </div>

                      {showInvestments && (
                          <div className="mt-6 pt-6 border-t border-slate-200 animate-slide-up">
                              <Card className="p-6 border-l-4 border-l-purple-500 bg-white shadow-sm mb-4">
                                  <div className="flex items-center gap-2 mb-4"><h3 className="font-bold text-slate-800">Montant total investi (Stock)</h3></div>
                                  <div className="flex gap-4 items-center">
                                      <div className="relative flex-1"><input type="text" value={formData.investments || ''} onChange={(e) => updateForm({ ...formData, investments: e.target.value })} className="w-full text-2xl font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 pl-4 focus:border-purple-500 outline-none transition-all" placeholder="0" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span></div>
                                      <div className="relative w-32"><input type="text" value={formData.investmentYield || ''} onChange={(e) => updateForm({ ...formData, investmentYield: e.target.value })} className="w-full text-xl font-bold text-purple-700 bg-purple-50 border border-purple-100 rounded-xl p-3 text-center outline-none" placeholder="5" /><span className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-300 text-xs font-bold">% /an</span></div>
                                  </div>
                              </Card>
                              <AccordionSection mode="expert" defaultOpen={true} title="Virements mensuels vers ces comptes" icon={PiggyBank} colorClass="text-purple-600" items={formData.savingsContributions} onItemChange={(id, f, v) => updateItem('savingsContributions', id, f, v)} onItemAdd={() => addItem('savingsContributions')} onItemRemove={(id) => removeItem('savingsContributions', id)} description="Ton effort d'épargne automatique (ex: Virement Livret A, PEA...)" />
                          </div>
                      )}
                  </div>
              </div>
          )}

          {/* --- ACTE 4 : LIFESTYLE (NOUVELLE VERSION SÉPARÉE) --- */}
          {currentStep === 4 && (
              <div className="space-y-8 animate-slide-up">
                  
                  {/* ON INJECTE LE DOCTEUR EN PRIORITÉ */}
                  {stats.diagnosis && (
                    <div className="bg-white rounded-3xl p-1 border border-slate-200 shadow-sm">
                        <FinancialDoctor diagnosis={stats.diagnosis} />
                    </div>
                  )}

                  {/* AJUSTEMENT DU BUDGET VARIABLE (SPLIT EN 2) */}
                  <Card className="p-6 border-slate-200">
                       <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <Zap className="text-amber-500" /> Ajustement Train de Vie
                       </h3>
                       <p className="text-sm text-slate-500 mb-6">
                           Pour affiner le diagnostic, séparez vos dépenses variables en deux catégories.
                       </p>

                       <div className="grid md:grid-cols-2 gap-6">
                           
                           {/* 1. COURSES & HYGIÈNE (Besoin) */}
                           <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                               <div className="flex items-center gap-3 mb-3">
                                   <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><ShoppingCart size={20}/></div>
                                   <div>
                                       <div className="font-bold text-slate-700">Alimentation & Quotidien</div>
                                       <div className="text-xs text-slate-400">Courses, produits d'entretien...</div>
                                   </div>
                               </div>
                               <div className="relative">
                                    <input 
                                        type="text" 
                                        value={formData.foodBudget || ''} 
                                        onChange={(e) => updateForm({ ...formData, foodBudget: parseNumber(e.target.value) })} 
                                        className="w-full text-2xl font-bold text-slate-800 bg-white border border-slate-200 rounded-xl p-3 pl-4 focus:border-indigo-500 outline-none transition-all" 
                                        placeholder="0" 
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
                               </div>
                           </div>

                           {/* 2. LOISIRS & SORTIES (Plaisir) */}
                           <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                               <div className="flex items-center gap-3 mb-3">
                                   <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Coffee size={20}/></div>
                                   <div>
                                       <div className="font-bold text-slate-700">Sorties & Plaisirs</div>
                                       <div className="text-xs text-slate-400">Resto, shopping, verres...</div>
                                   </div>
                               </div>
                               <div className="relative">
                                    <input 
                                        type="text" 
                                        value={formData.funBudget || ''} 
                                        onChange={(e) => updateForm({ ...formData, funBudget: parseNumber(e.target.value) })} 
                                        className="w-full text-2xl font-bold text-slate-800 bg-white border border-slate-200 rounded-xl p-3 pl-4 focus:border-purple-500 outline-none transition-all" 
                                        placeholder="0" 
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
                               </div>
                           </div>
                       </div>

                       <div className="mt-6 p-4 bg-indigo-50 rounded-xl flex justify-between items-center">
                           <span className="text-indigo-900 font-medium">Total Variable Estimé</span>
                           <span className="text-2xl font-black text-indigo-700">{formatCurrency(stats.discretionaryExpenses)}</span>
                       </div>
                  </Card>
              </div>
          )}

          {/* NAV */}
          <div className="flex justify-between items-center pt-8 mt-8 border-t border-slate-100">
              <button onClick={goPrev} disabled={currentStep === 1} type="button" className={`px-6 py-3 font-bold rounded-xl transition-colors flex items-center gap-2 ${currentStep === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-100'}`}><ChevronLeft size={20} /> Précédent</button>
              <Button onClick={goNext} disabled={isSaving} type="button" className="px-8 py-4 shadow-xl flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white">{isSaving ? 'Sauvegarde...' : currentStep === 4 ? 'Valider et Terminer' : 'Continuer'} {(!isSaving && currentStep < 4) && <ArrowRight size={20} />}</Button>
          </div>

        </div>
      </div>
    </>
  );
}