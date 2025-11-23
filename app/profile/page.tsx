'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import {
  calculateFinancials,
  formatCurrency,
  generateId,
  PERSONA_PRESETS
} from '@/app/lib/logic';

// --- NOUVEL IMPORT ---
import AccordionSection from '@/app/components/AccordionSection';

// Imports Icones
import {
  Save, Wallet, Home, Tv, Landmark, Calendar,
  User, Briefcase, GraduationCap, Armchair, Baby, Target, Minus, CheckCircle,
  Search, Info, CreditCard, PiggyBank, ArrowRight, ChevronLeft,
  Zap, Shield, Plus
} from 'lucide-react';

// --- IMPORTS UI KIT ---
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import InputGroup from '@/app/components/ui/InputGroup';
import Tooltip from '@/app/components/ui/Tooltip';

// --- CONFIGURATION DES 5 ÉTAPES ---
const STEPS = [
  { id: 1, label: "Identité", icon: User },
  { id: 2, label: "Patrimoine", icon: Shield },
  { id: 3, label: "Budget Vital", icon: Wallet },
  { id: 4, label: "Détails", icon: Tv },
  { id: 5, label: "Train de Vie", icon: Zap },
];

// --- COMPOSANT INFO BOX ---
// (Conservé ici car utilisé dans les étapes 1, 2 et 5 hors accordéons)
const InfoBox = ({ children, className = "mb-6" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex gap-3 text-xs text-indigo-800 ${className}`}>
    <Info size={16} className="shrink-0 mt-0.5 text-indigo-500" />
    <div className="leading-relaxed opacity-90 font-medium">{children}</div>
  </div>
);

// --- COMPOSANTS HELPERS LOCAUX ---

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

// --- PAGE PRINCIPALE ---

export default function ProfilePage() {
  const { profile, saveProfile, isLoaded } = useFinancialData();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const stats = useMemo(() => calculateFinancials(profile), [profile]);

  if (!isLoaded) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-pulse h-12 w-12 bg-slate-200 rounded-full"></div></div>;

  const mode = profile.mode || 'beginner';
  const isExpert = mode === 'expert';
  const toggleMode = () => saveProfile({ ...profile, mode: isExpert ? 'beginner' : 'expert' });

  const goNext = () => {
      if (currentStep < 5) setCurrentStep(currentStep + 1);
      else router.push('/'); 
  };
  const goPrev = () => setCurrentStep(Math.max(1, currentStep - 1));

  // Typage amélioré pour la compatibilité avec AccordionSection
  const updateItem = (listName: string, id: string, field: string, value: any) => {
    const list = (profile as any)[listName] || [];
    const newList = list.map((item: any) => item.id === id ? { ...item, [field]: value } : item);
    saveProfile({ ...profile, [listName]: newList });
  };

  const addItem = (listName: string) => {
    const isAnnual = listName === 'annualExpenses';
    const newItem = { 
        id: generateId(), 
        name: '', 
        amount: '', 
        frequency: isAnnual ? 'annuel' : 'mensuel', 
        dayOfMonth: 5 
    };
    const currentList = (profile as any)[listName] || [];
    saveProfile({ ...profile, [listName]: [...currentList, newItem] });
  };

  const removeItem = (listName: string, id: string) => {
    const list = (profile as any)[listName] || [];
    const newList = list.filter((item: any) => item.id !== id);
    saveProfile({ ...profile, [listName]: newList });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in pb-24">
      
      {/* --- EN-TÊTE : STEPPER --- */}
      <div className="lg:col-span-12 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
         <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-6">
            <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Configuration Profil</h1>
                <p className="text-sm text-slate-500 font-medium">Étape {currentStep} sur 5</p>
            </div>
            <button onClick={toggleMode} className={`text-xs font-bold px-4 py-2 rounded-full border transition-all ${isExpert ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}>
                {isExpert ? '🚀 Mode Expert' : '🐣 Mode Simple'}
            </button>
         </div>
         <div className="flex items-center justify-between relative px-4 md:px-12">
             <div className="absolute left-6 right-6 top-5 h-1 bg-slate-100 -z-0 rounded-full">
                <div className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out" style={{ width: `${((currentStep - 1) / 4) * 100}%` }}></div>
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

      {/* SIDEBAR DROITE (SYNTHÈSE) */}
      <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6 order-first lg:order-last hidden md:block">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6">Répartition</h2>
          <div className="space-y-4 relative z-10">
            <div className="flex justify-between items-center mb-4"><div className="flex items-center gap-2 text-emerald-600 text-sm font-bold"><Wallet size={18} /> Revenus</div><span className="font-bold text-lg text-emerald-600">{formatCurrency(stats.monthlyIncome)}</span></div>
            <div className="space-y-2 pl-2 border-l-2 border-slate-100">
                <div className="flex justify-between items-center text-sm"><div className="flex items-center gap-2 text-slate-500">Charges Fixes</div><span className="font-medium text-slate-700">- {formatCurrency(stats.mandatoryExpenses)}</span></div>
                <div className="flex justify-between items-center text-sm"><div className="flex items-center gap-2 text-slate-500">Vie Courante</div><span className="font-medium text-slate-700">- {formatCurrency(stats.discretionaryExpenses)}</span></div>
                {(isExpert || stats.profitableExpenses > 0) && (<div className="flex justify-between items-center text-sm animate-fade-in"><div className="flex items-center gap-2 text-purple-600 font-bold">Épargne Active <Tooltip text="Argent investi (PEA, Immo...)" /></div><span className="font-bold text-purple-600">- {formatCurrency(stats.profitableExpenses)}</span></div>)}
            </div>
            <div className="h-px bg-slate-100 my-4"></div>
            <div className="flex justify-between items-end"><div className="text-sm text-slate-400">Cashflow Réel</div><div className={`text-2xl font-black tracking-tight ${stats.realCashflow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{stats.realCashflow > 0 ? '+' : ''}{formatCurrency(stats.realCashflow)}</div></div>
          </div>
        </div>
        
        <Card className="p-6 border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-2 mb-4"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Target size={20} /></div><h3 className="font-bold text-slate-800">Objectifs</h3></div>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center"><span className="text-slate-500">Sécurité visée</span><span className="font-bold text-indigo-700">{stats.rules.safetyMonths} mois</span></div>
            <div className="flex justify-between items-center"><span className="text-slate-500">Dette Max</span><span className="font-bold text-indigo-700">{stats.rules.maxDebt}%</span></div>
          </div>
        </Card>
        <div className="hidden lg:block"><Button onClick={() => router.push('/')} className="w-full"><Save size={18} /> Enregistrer</Button></div>
      </div>

      {/* --- COLONNE GAUCHE (CONTENU PAR ÉTAPE) --- */}
      <div className="lg:col-span-8 space-y-8 min-h-[50vh]">
        
        {/* ÉTAPE 1 : IDENTITÉ */}
        {currentStep === 1 && (
            <div className="space-y-6 animate-slide-up">
                <h2 className="text-lg font-bold text-slate-800 mb-4">1. Commençons par les bases</h2>
                <InfoBox>Le coach utilise ta situation pour calibrer ses alertes. Un freelance n&apos;a pas les mêmes risques qu&apos;un fonctionnaire !</InfoBox>
                <Card className="p-6">
                    <div className="space-y-6">
                        <InputGroup label="Ton Prénom" placeholder="Tom" value={profile.firstName || ''} onChange={(val: string) => saveProfile({ ...profile, firstName: val })} />
                        {/* TOUJOURS VISIBLE */}
                        <div><label className="block text-sm font-medium text-slate-600 mb-2">Ta situation</label><PersonaSelector currentPersona={profile.persona || 'salaried'} onChange={(id: string) => saveProfile({ ...profile, persona: id })} /></div>
                        <div><label className="block text-sm font-medium text-slate-600 mb-2">Ton foyer</label><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><HouseholdCounter label="Adultes" icon={User} value={parseInt(profile.household?.adults) || 1} onChange={(v: number) => saveProfile({ ...profile, household: { ...profile.household, adults: v } })} /><HouseholdCounter label="Enfants" icon={Baby} value={parseInt(profile.household?.children) || 0} onChange={(v: number) => saveProfile({ ...profile, household: { ...profile.household, children: v } })} /></div></div>
                    </div>
                </Card>
            </div>
        )}

        {/* ÉTAPE 2 : PATRIMOINE */}
        {currentStep === 2 && (
            <div className="space-y-6 animate-slide-up">
                <div className="flex justify-between items-end">
                    <h2 className="text-lg font-bold text-slate-800">2. Photo à l&apos;instant T</h2>
                </div>
                <InfoBox>Renseigne les soldes de tes comptes <strong>aujourd&apos;hui</strong>. C&apos;est le point de départ GPS du calendrier.</InfoBox>
                
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4`}>
                    {/* Compte Courant */}
                    <Card className="p-6 border-l-4 border-l-indigo-500">
                        <div className="flex items-center gap-2 mb-4"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><CreditCard size={20} /></div><h3 className="font-bold text-slate-800">Compte Courant</h3></div>
                        <div className="relative"><input type="number" value={profile.currentBalance || ''} onChange={(e) => saveProfile({ ...profile, currentBalance: parseFloat(e.target.value) || 0 })} className="w-full text-2xl font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 pl-4 focus:border-indigo-500 outline-none transition-all" placeholder="0" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span></div>
                        <InfoBox className="mt-4 mb-0 border-indigo-100 bg-indigo-50 text-indigo-800">Trésorerie active. Ce qui sert à payer les factures du mois.</InfoBox>
                    </Card>

                    {/* Épargne Dispo */}
                    <Card className="p-6 border-l-4 border-l-emerald-500">
                        <div className="flex items-center gap-2 mb-4"><div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Shield size={20} /></div><h3 className="font-bold text-slate-800">Épargne Dispo</h3></div>
                        <div className="relative"><input type="number" value={profile.savings} onChange={(e) => saveProfile({ ...profile, savings: e.target.value })} className="w-full text-2xl font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 pl-4 focus:border-emerald-500 outline-none transition-all" placeholder="0" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span></div>
                        <InfoBox className="mt-4 mb-0 border-emerald-100 bg-emerald-50 text-emerald-800">Livret A, LDD. L&apos;argent accessible en 24h en cas de coup dur.</InfoBox>
                    </Card>

                    {/* Investissements */}
                    {isExpert && (
                        <Card className="p-6 border-l-4 border-l-purple-500 md:col-span-2 animate-fade-in">
                            <div className="flex items-center gap-2 mb-4"><div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><PiggyBank size={20} /></div><h3 className="font-bold text-slate-800">Invest. Bloqué</h3></div>
                            <div className="flex gap-4 items-center">
                                <div className="relative flex-1"><input type="number" value={profile.investments || ''} onChange={(e) => saveProfile({ ...profile, investments: parseFloat(e.target.value) || 0 })} className="w-full text-2xl font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 pl-4 focus:border-purple-500 outline-none transition-all" placeholder="0" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span></div>
                                <div className="relative w-24"><input type="number" value={profile.investmentYield || ''} onChange={(e) => saveProfile({ ...profile, investmentYield: parseFloat(e.target.value) || 0 })} className="w-full text-xl font-bold text-purple-700 bg-purple-50 border border-purple-100 rounded-xl p-3 text-center outline-none" placeholder="5" /><span className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-300 text-xs font-bold">%</span></div>
                            </div>
                            <InfoBox className="mt-4 mb-0 border-purple-100 bg-purple-50 text-purple-800">Patrimoine Long Terme (PEA, Crypto, Immo). Argent que tu ne touches pas.</InfoBox>
                        </Card>
                    )}
                </div>
            </div>
        )}

        {/* ÉTAPE 3 : BUDGET (GROS FLUX) */}
        {currentStep === 3 && (
            <div className="space-y-6 animate-slide-up">
                <h2 className="text-lg font-bold text-slate-800 mb-4">3. Tes Flux Mensuels</h2>
                <InfoBox>Indique ici ce qui rentre et sort <strong>automatiquement</strong> chaque mois. Ne mets pas les petits abonnements ou les crédits ici, on verra ça à l&apos;étape suivante.</InfoBox>
                
                <AccordionSection 
                    mode={mode} defaultOpen={true} title="Revenus (Net)" icon={Wallet} colorClass="text-emerald-600" 
                    items={profile.incomes} 
                    onItemChange={(id, f, v) => updateItem('incomes', id, f, v)} 
                    onItemAdd={() => addItem('incomes')} 
                    onItemRemove={(id) => removeItem('incomes', id)}
                    description="✅ INCLUS : Salaire Net, Primes lissées, Aides CAF, Rentes. ❌ EXCLUS : Virements internes." 
                />
                
                <AccordionSection 
                    mode={mode} defaultOpen={true} title="Charges Fixes Vitales" icon={Home} colorClass="text-blue-600" 
                    items={profile.fixedCosts} 
                    onItemChange={(id, f, v) => updateItem('fixedCosts', id, f, v)} 
                    onItemAdd={() => addItem('fixedCosts')} 
                    onItemRemove={(id) => removeItem('fixedCosts', id)} 
                    description="✅ INCLUS : Loyer, Électricité, Eau, Assurances, Pension alimentaire. ❌ EXCLUS : Netflix, Crédits, Courses."
                />
                
                {isExpert && (
                    <AccordionSection 
                        mode={mode} title="Investissements Mensuels" icon={PiggyBank} colorClass="text-purple-600" 
                        items={profile.savingsContributions} 
                        onItemChange={(id, f, v) => updateItem('savingsContributions', id, f, v)} 
                        onItemAdd={() => addItem('savingsContributions')} 
                        onItemRemove={(id) => removeItem('savingsContributions', id)} 
                        description="Virements automatiques vers tes comptes d'investissement. L'argent qui te paie toi en premier."
                    />
                )}
            </div>
        )}

        {/* ÉTAPE 4 : DÉTAILS */}
        {currentStep === 4 && (
            <div className="space-y-6 animate-slide-up">
                <h2 className="text-lg font-bold text-slate-800 mb-4">4. Les détails qui comptent</h2>
                <InfoBox>C&apos;est ici qu&apos;on traque les fuites ! Abonnements, Crédits... tout ce qui grignote ton budget petit à petit.</InfoBox>
                <div className="grid grid-cols-1 gap-4">
                    <AccordionSection 
                        defaultOpen={true} description="✅ INCLUS : Netflix, Spotify, Salle de sport, Forfait téléphone." mode={mode} title="Abonnements" icon={Tv} colorClass="text-purple-600" type="simple" 
                        items={profile.subscriptions} 
                        onItemChange={(id, f, v) => updateItem('subscriptions', id, f, v)} 
                        onItemAdd={() => addItem('subscriptions')} 
                        onItemRemove={(id) => removeItem('subscriptions', id)} 
                    />
                    <AccordionSection 
                        description="✅ INCLUS : Mensualités de crédit Immo, Auto, ou paiement en 3x." mode={mode} title="Crédits en cours" icon={Landmark} colorClass="text-orange-600" type="simple" 
                        items={profile.credits} 
                        onItemChange={(id, f, v) => updateItem('credits', id, f, v)} 
                        onItemAdd={() => addItem('credits')} 
                        onItemRemove={(id) => removeItem('credits', id)} 
                    />
                    {isExpert && (
                        <AccordionSection 
                            unit="an" description="✅ INCLUS : Taxe Foncière, Impôts revenu, Vacances (total annuel)." mode={mode} title="Dépenses Annuelles" icon={Calendar} colorClass="text-pink-600" 
                            items={profile.annualExpenses} 
                            onItemChange={(id, f, v) => updateItem('annualExpenses', id, f, v)} 
                            onItemAdd={() => addItem('annualExpenses')} 
                            onItemRemove={(id) => removeItem('annualExpenses', id)} 
                        />
                    )}
                </div>
            </div>
        )}

        {/* ÉTAPE 5 : ARBITRAGE (LE TRAIN DE VIE) */}
        {currentStep === 5 && (
            <div className="space-y-8 animate-slide-up">
                <h2 className="text-lg font-bold text-slate-800 mb-4">5. Ton choix de vie</h2>
                
                {/* GROS CALCULATEUR VISUEL */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-xl">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex-1">
                            <h3 className="text-2xl font-bold mb-2 flex items-center gap-2"><Zap className="text-yellow-300 fill-yellow-300" /> Le Verdict</h3>
                            <p className="text-indigo-100 text-sm leading-relaxed mb-6">
                                Une fois toutes tes charges payées (Étapes 3 & 4), il te reste théoriquement <strong>{formatCurrency(stats.remainingToLive)}</strong>.
                                <br/><br/>
                                Combien veux-tu dépenser pour tes <strong>Courses & Plaisirs</strong> (Vie courante) ?
                            </p>
                            
                            <div className="relative max-w-xs">
                                <input 
                                    type="number" 
                                    value={profile.variableCosts || ''} 
                                    onChange={(e) => saveProfile({ ...profile, variableCosts: parseFloat(e.target.value) || 0 })} 
                                    className="w-full p-4 pl-6 pr-12 bg-white/10 border border-white/20 rounded-2xl text-3xl font-bold text-white placeholder:text-white/30 focus:bg-white/20 outline-none backdrop-blur-sm transition-all" 
                                    placeholder="0" 
                                />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-indigo-200 font-medium">€</span>
                            </div>
                        </div>
                        
                        {/* Jauge Résultat */}
                        <div className="flex flex-col items-center justify-center bg-white/10 rounded-2xl p-6 w-full md:w-48 backdrop-blur-md border border-white/10">
                            <div className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-2">Épargne Réelle</div>
                            <div className={`text-4xl font-black ${stats.capacityToSave > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{formatCurrency(stats.capacityToSave)}</div>
                            <div className="text-xs text-white/60 mt-1">par mois</div>
                        </div>
                    </div>
                </div>

                <InfoBox>
                    <strong>Astuce :</strong> Ce montant &quot;Vie Courante&quot; sera déduit petit à petit chaque jour dans ton calendrier (Lissage). C&apos;est ce qui permet de suivre ton budget sans noter chaque café !
                </InfoBox>
            </div>
        )}

        {/* --- NAVIGATION DU BAS --- */}
        <div className="flex justify-between items-center pt-8 mt-8 border-t border-slate-100">
            <button onClick={goPrev} disabled={currentStep === 1} className={`px-6 py-3 font-bold rounded-xl transition-colors flex items-center gap-2 ${currentStep === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-100'}`}><ChevronLeft size={20} /> Précédent</button>
            <Button onClick={goNext} className="px-8 py-4 shadow-xl flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white">{currentStep === 5 ? 'Terminer' : 'Continuer'} {currentStep < 5 && <ArrowRight size={20} />}</Button>
        </div>

      </div>
    </div>
  );
}