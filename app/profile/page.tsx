'use client';

import React, { useMemo, useState, useEffect, ReactNode } from 'react';
import { useFinancialData } from '@/app/hooks/useFinancialData';

// ✅ IMPORTS MOTEUR & DEFINITIONS
import { computeFinancialPlan as runSimulation } from '@/app/lib/engine';
import { 
  ASSET_TYPES, 
  formatCurrency, 
  generateId, 
  calculateListTotal,
  Profile,
  FinancialItem 
} from '@/app/lib/definitions';

// --- COMPOSANTS UI ---
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import InputGroup from '@/app/components/ui/InputGroup';
import ProgressBar from '@/app/components/ui/ProgressBar';
import Badge from '@/app/components/ui/Badge';
import AccordionSection from '@/app/components/AccordionSection';

// Icons
import {
  Wallet, Briefcase, GraduationCap, Armchair, Minus, CheckCircle,
  CreditCard, ArrowRight, Home, Building, Target,
  HeartHandshake, Plus, Loader2, AlertCircle, User, ShieldCheck, Banknote,
  Zap, Calendar, TrendingUp, Flag, LucideIcon, ShoppingCart, Coffee, Car,
  Coins, Landmark, Sprout, Building2, PiggyBank, Gem, Key, Trash2, CalendarDays
} from 'lucide-react';

// ============================================================================
// 1. TYPES UI SPÉCIFIQUES (CLEAN ARCHITECTURE)
// ============================================================================

// Représente une ligne unifiée dans l'écran Patrimoine
interface AssetUiRow {
  id: string;
  type: string;
  name: string;
  stock: number;       // Solde Actuel (Ce que j'ai)
  monthlyFlow: number; // Versement (Ce que je mets)
  transferDay: number; // Jour du prélèvement
}

// Extension du profil pour le formulaire local
interface FormProfile extends Omit<Profile, 'investments' | 'savingsContributions'> {
  // On remplace les listes complexes par notre liste UI propre
  assetsUi: AssetUiRow[];
  
  // Les autres listes restent standard
  incomes: FinancialItem[];
  fixedCosts: FinancialItem[];
  variableCosts: FinancialItem[];
  credits: FinancialItem[];
  subscriptions: FinancialItem[];
  annualExpenses: FinancialItem[];
}

// ============================================================================
// 2. MAPPERS (LA LOGIQUE PROPRE)
// ============================================================================

/**
 * LECTURE : DB (Complexe) -> Formulaire UI (Simple)
 * Fusionne Investments (Stock) et SavingsContributions (Flux)
 */
const mapProfileToForm = (profile: Profile): FormProfile => {
  const assetsUi: AssetUiRow[] = [];
  
  // On itère sur les STOCKS (Investments) car c'est la source de vérité des comptes ouverts
  (profile.investments || []).forEach(inv => {
    // On cherche le FLUX correspondant via l'ID
    const matchingFlow = (profile.savingsContributions || []).find(f => f.id === inv.id);
    
    // Rétro-compatibilité : si currentValue n'existe pas, on prend amount
    const stockValue = (inv as any).currentValue ?? inv.amount;

    assetsUi.push({
      id: inv.id,
      type: inv.type || 'unknown',
      name: inv.name,
      stock: parseFloat(String(stockValue)) || 0,
      monthlyFlow: matchingFlow ? (parseFloat(String(matchingFlow.amount)) || 0) : 0,
      transferDay: matchingFlow ? (Number(matchingFlow.dayOfMonth) || 1) : 1
    });
  });

  // Initialisation par défaut si vide (au moins un Compte Courant)
  if (assetsUi.length === 0) {
    assetsUi.push({ id: generateId(), type: 'cc', name: 'Compte Courant', stock: 0, monthlyFlow: 0, transferDay: 1 });
  }

  return {
    ...profile,
    assetsUi,
    // Garantir que les tableaux ne sont jamais undefined
    incomes: profile.incomes || [],
    fixedCosts: profile.fixedCosts || [],
    variableCosts: profile.variableCosts || [],
    credits: profile.credits || [],
    subscriptions: profile.subscriptions || [],
    annualExpenses: profile.annualExpenses || [],
  } as FormProfile;
};

/**
 * ÉCRITURE : Formulaire UI (Simple) -> DB (Complexe)
 * Sépare la liste UI en deux listes distinctes pour le moteur
 */
const mapFormToProfile = (formData: FormProfile, lifestyle: number): Profile => {
  
  // 1. Calcul des totaux
  let totalCash = 0;
  let totalInvested = 0;
  let totalSavings = 0; 

  formData.assetsUi.forEach(asset => {
    const def = ASSET_TYPES.find(a => a.id === asset.type);
    const val = asset.stock;

    if (asset.type === 'cc') totalCash += val;
    else if (def?.category === 'CASH' || def?.category === 'LIQUIDITY') totalSavings += val;
    else totalInvested += val;
  });

  // 2. Génération liste STOCK (Investments)
  // Pour le moteur : amount = stock. Pour l'UI future : currentValue = stock.
  const investments = formData.assetsUi.map(a => ({
    id: a.id,
    type: a.type,
    name: a.name,
    amount: a.stock, 
    currentValue: a.stock, 
    frequency: 'mensuel'
  }));

  // 3. Génération liste FLUX (SavingsContributions)
  // On ne garde que ceux qui ont un versement > 0 et qui ne sont pas le compte courant
  const savingsContributions = formData.assetsUi
    .filter(a => a.type !== 'cc' && a.monthlyFlow > 0)
    .map(a => ({
      id: a.id, 
      name: a.name,
      amount: a.monthlyFlow,
      dayOfMonth: a.transferDay,
      frequency: 'mensuel'
    }));

  // 4. Nettoyage Housing
  let housingCost = formData.housing?.monthlyCost || 0;
  if (['free', 'owner_paid'].includes(formData.housing?.status)) housingCost = 0;

  return {
    ...formData,
    funBudget: lifestyle,
    investedAmount: totalInvested,
    savings: totalSavings,
    currentBalance: totalCash,
    investments,           // ✅ Liste 1 : Patrimoine
    savingsContributions,  // ✅ Liste 2 : Budget Mensuel
    housing: { ...formData.housing, monthlyCost: housingCost },
    updatedAt: new Date().toISOString()
  } as Profile;
};

// ============================================================================
// 3. HELPERS UI
// ============================================================================

const getInputValue = (e: React.ChangeEvent<HTMLInputElement> | string | number) => {
  if (typeof e === 'object' && e !== null && 'target' in e) return e.target.value;
  return e;
};
const parseNumber = (val: string | number | undefined): number => parseFloat(String(val).replace(/\s/g, '').replace(',', '.')) || 0;
const generateIdHelper = () => Math.random().toString(36).substr(2, 9);

// ============================================================================
// 4. LAYOUT & COMPOSANTS VISUELS
// ============================================================================

interface WizardLayoutProps { title: string; subtitle: string; icon: LucideIcon; children: ReactNode; footer?: ReactNode; }

const WizardLayout = ({ title, subtitle, icon: Icon, children, footer }: WizardLayoutProps) => (
  <div className="w-full max-w-2xl mx-auto lg:mx-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center lg:text-left mb-8">
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-4"><Icon size={28} /></div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">{title}</h1>
          <p className="text-slate-500 text-lg max-w-md mx-auto lg:mx-0">{subtitle}</p>
      </div>
      <Card className="p-6 md:p-10 shadow-xl shadow-slate-200/40 border-slate-100">
          {children}
          {footer && <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between gap-4">{footer}</div>}
      </Card>
  </div>
);

const SelectionTile = ({ selected, onClick, icon: Icon, title, desc }: any) => (
  <div onClick={onClick} role="button" className={`cursor-pointer relative p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 text-left ${selected ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-300 bg-white'}`}>
    <div className={`p-2.5 rounded-lg ${selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}><Icon size={20} /></div>
    <div className="flex-1"><h3 className={`font-bold text-sm ${selected ? 'text-indigo-900' : 'text-slate-900'}`}>{title}</h3><p className="text-xs text-slate-500">{desc}</p></div>
    {selected && <CheckCircle className="text-indigo-600" size={18} />}
  </div>
);

const CounterControl = ({ label, value, onChange }: any) => (
    <div className="flex flex-col items-center w-full p-4 border border-slate-100 rounded-xl bg-slate-50/50">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{label}</span>
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => onChange(Math.max(0, value-1))} className="h-8 w-8 rounded-full p-0 flex items-center justify-center"><Minus size={14}/></Button>
            <span className="text-2xl font-black text-slate-800 w-8 text-center">{value}</span>
            <Button variant="outline" size="icon" onClick={() => onChange(value+1)} className="h-8 w-8 rounded-full p-0 flex items-center justify-center"><Plus size={14}/></Button>
        </div>
    </div>
);

interface LiveSummaryProps {
    formData: FormProfile;
    stats: { income: number; fixed: number; variable: number; investments: number; ratio: number; remaining: number; };
    currentStep: number;
}

const LiveSummary = ({ formData, stats, currentStep }: LiveSummaryProps) => {
  const { income = 0, fixed = 0, variable = 0, investments = 0, ratio = 0, remaining = 0 } = stats || {};
  const ratioColor = ratio > 60 ? 'bg-orange-500' : ratio > 40 ? 'bg-yellow-500' : 'bg-emerald-500';
  const badgeColor = ratio > 60 ? 'text-orange-600 border-orange-200 bg-orange-50' : ratio > 40 ? 'text-yellow-600 border-yellow-200 bg-yellow-50' : 'text-emerald-600 border-emerald-200 bg-emerald-50';

  return (
    <div className="sticky top-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
      <Card className="p-6 border-indigo-100 shadow-lg shadow-indigo-100/50 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-3 opacity-10"><User size={64} /></div>
        <div className="relative z-10">
          <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">Votre Profil</h3>
          <div className="text-2xl font-black text-slate-800 truncate">{formData.firstName || "Invité"}</div>
          <div className="flex flex-wrap gap-2 mt-3">
              {formData.age && <Badge variant="secondary" className="bg-slate-100 text-slate-600">{formData.age} ans</Badge>}
              {formData.persona && <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 capitalize">{formData.persona === 'salaried' ? 'Salarié' : formData.persona}</Badge>}
          </div>
        </div>
      </Card>

      {(currentStep >= 3 || income > 0) && (
          <Card className="p-6 border-slate-200 shadow-lg">
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Synthèse Mensuelle</h3>
                <Badge variant="outline" className={badgeColor}>{Math.round(ratio)}% Engagés</Badge>
             </div>
             <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex mb-6">
                <div style={{ width: `${Math.min(ratio, 100)}%` }} className={`h-full ${ratioColor} transition-all duration-500`} />
                <div className="h-full bg-indigo-500 flex-1 transition-all duration-500" />
             </div>
             <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-300"/> Revenus</span>
                    <span className="font-bold text-slate-900">{formatCurrency(income)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-400"/> Charges Fixes</span>
                    <span className="font-bold text-slate-900 text-rose-600">-{formatCurrency(fixed)}</span>
                </div>
                {variable > 0 && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-400"/> Vie Quotidienne</span>
                        <span className="font-bold text-slate-700">-{formatCurrency(variable)}</span>
                    </div>
                )}
                {investments > 0 && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Investissements</span>
                        <span className="font-bold text-emerald-600">-{formatCurrency(investments)}</span>
                    </div>
                )}
                <div className="pt-3 border-t border-slate-100 flex justify-between items-center mt-3">
                    <span className="font-bold text-slate-700 uppercase text-xs">Vrai Reste à vivre</span>
                    <span className="font-black text-xl text-indigo-600">{formatCurrency(remaining)}</span>
                </div>
             </div>
          </Card>
      )}
    </div>
  );
};

// ============================================================================
// 5. ÉTAPES DU WIZARD
// ============================================================================

interface StepProps {
    formData: FormProfile;
    updateForm: (data: FormProfile) => void;
    onNext?: () => void;
    onPrev?: () => void;
    addItem?: (list: keyof FormProfile) => void;
    removeItem?: (list: keyof FormProfile, id: string) => void;
    updateItem?: (list: keyof FormProfile, id: string, field: string, val: any) => void;
    onConfirm?: (lifestyle: number, savings: number) => void;
    isSaving?: boolean;
    stats?: any;
}

const StepIdentite = ({ formData, updateForm, onNext }: StepProps) => (
    <WizardLayout title="Qui êtes-vous ?" subtitle="Ces infos calibrent nos projections." icon={User}
        footer={<Button onClick={onNext} disabled={!formData.firstName || !formData.age} className="w-full" size="lg">C'est parti <ArrowRight className="ml-2" size={18}/></Button>}>
        <div className="space-y-6">
            <InputGroup label="Votre Prénom" placeholder="Ex: Thomas" value={formData.firstName || ''} onChange={(e: any) => updateForm({...formData, firstName: getInputValue(e) as string})} autoFocus />
            <div className={`transition-opacity duration-500 ${formData.firstName ? 'opacity-100' : 'opacity-30'}`}>
                <InputGroup label="Votre Âge" type="number" placeholder="30" value={formData.age || ''} onChange={(e: any) => updateForm({...formData, age: getInputValue(e) as string})} endAdornment={<span className="text-slate-400 font-bold px-3">ans</span>} />
            </div>
        </div>
    </WizardLayout>
);

const StepSituation = ({ formData, updateForm, onNext, onPrev }: StepProps) => (
  <WizardLayout title="Votre Situation" subtitle="Adaptons la stratégie à votre profil." icon={Briefcase}
      footer={<><Button variant="ghost" onClick={onPrev}>Retour</Button><Button onClick={onNext}>Continuer <ArrowRight className="ml-2" size={18}/></Button></>}>
      <div className="space-y-8">
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-3">Statut Pro</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <SelectionTile icon={Briefcase} title="Salarié" desc="CDI / CDD" selected={formData.persona === 'salaried'} onClick={() => updateForm({ ...formData, persona: 'salaried' })} />
                  <SelectionTile icon={Target} title="Indépendant" desc="Freelance" selected={formData.persona === 'freelance'} onClick={() => updateForm({ ...formData, persona: 'freelance' })} />
                  <SelectionTile icon={GraduationCap} title="Étudiant" desc="Études" selected={formData.persona === 'student'} onClick={() => updateForm({ ...formData, persona: 'student' })} />
                  <SelectionTile icon={Armchair} title="Retraité" desc="Pension" selected={formData.persona === 'retired'} onClick={() => updateForm({ ...formData, persona: 'retired' })} />
              </div>
          </div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-3">Logement</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <SelectionTile icon={Building} title="Locataire" desc="Loyer" selected={formData.housing?.status === 'tenant'} onClick={() => updateForm({ ...formData, housing: { ...formData.housing, status: 'tenant' } })} />
                  <SelectionTile icon={Home} title="Propriétaire" desc="Crédit" selected={formData.housing?.status === 'owner_loan'} onClick={() => updateForm({ ...formData, housing: { ...formData.housing, status: 'owner_loan' } })} />
                  <SelectionTile icon={CheckCircle} title="Propriétaire" desc="Payé" selected={formData.housing?.status === 'owner_paid'} onClick={() => updateForm({ ...formData, housing: { ...formData.housing, status: 'owner_paid', monthlyCost: 0 } })} />
                  <SelectionTile icon={HeartHandshake} title="Gratuit" desc="Hébergé" selected={formData.housing?.status === 'free'} onClick={() => updateForm({ ...formData, housing: { ...formData.housing, status: 'free', monthlyCost: 0 } })} />
              </div>
          </div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-3">Foyer</label>
              <div className="flex gap-4">
                  <CounterControl label="Adultes" value={formData.household?.adults || 1} onChange={(v:number) => updateForm({ ...formData, household: {...formData.household, adults: v}})} />
                  <CounterControl label="Enfants" value={formData.household?.children || 0} onChange={(v:number) => updateForm({ ...formData, household: {...formData.household, children: v}})} />
              </div>
          </div>
      </div>
  </WizardLayout>
);

const StepFixedFinances = ({ formData, updateForm, addItem, removeItem, updateItem, onNext, onPrev }: StepProps) => (
    <WizardLayout title="Revenus & Charges Fixes" subtitle="Ce qui tombe à date fixe chaque mois." icon={Wallet}
        footer={<><Button variant="ghost" onClick={onPrev}>Retour</Button><Button onClick={onNext}>Vie Quotidienne <ArrowRight className="ml-2" size={18}/></Button></>}>
        <div className="space-y-6">
            <AccordionSection mode="expert" defaultOpen={true} title="Revenus (Net)" icon={Banknote} colorClass="text-emerald-600" items={formData.incomes} onItemChange={(id: string, f: string, v: any) => updateItem!('incomes', id, f, v)} onItemAdd={() => addItem!('incomes')} onItemRemove={(id: string) => removeItem!('incomes', id)} />
            {formData.housing?.status !== 'free' && formData.housing?.status !== 'owner_paid' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <InputGroup label={formData.housing?.status === 'tenant' ? "Loyer Mensuel" : "Mensualité Crédit"} type="number" placeholder="800" value={formData.housing?.monthlyCost || ''} onChange={(e: any) => updateForm({ ...formData, housing: { ...formData.housing, monthlyCost: parseNumber(getInputValue(e)) } })} endAdornment={<span className="text-slate-400 font-bold px-3">€</span>} />
                </div>
            )}
            <AccordionSection mode="expert" defaultOpen={false} title="Factures Fixes" icon={CreditCard} colorClass="text-slate-600" items={formData.fixedCosts} onItemChange={(id: string, f: string, v: any) => updateItem!('fixedCosts', id, f, v)} onItemAdd={() => addItem!('fixedCosts')} onItemRemove={(id: string) => removeItem!('fixedCosts', id)} />
            <AccordionSection mode="expert" defaultOpen={false} title="Abonnements" icon={Zap} colorClass="text-purple-500" items={formData.subscriptions} onItemChange={(id: string, f: string, v: any) => updateItem!('subscriptions', id, f, v)} onItemAdd={() => addItem!('subscriptions')} onItemRemove={(id: string) => removeItem!('subscriptions', id)} />
            <AccordionSection mode="expert" defaultOpen={false} title="Dépenses Annuelles" icon={Calendar} colorClass="text-orange-500" items={formData.annualExpenses} onItemChange={(id: string, f: string, v: any) => updateItem!('annualExpenses', id, f, v)} onItemAdd={() => addItem!('annualExpenses')} onItemRemove={(id: string) => removeItem!('annualExpenses', id)} />
            <AccordionSection mode="expert" defaultOpen={false} title="Crédits Conso" icon={AlertCircle} colorClass="text-rose-500" items={formData.credits} onItemChange={(id: string, f: string, v: any) => updateItem!('credits', id, f, v)} onItemAdd={() => addItem!('credits')} onItemRemove={(id: string) => removeItem!('credits', id)} />
        </div>
    </WizardLayout>
);

const StepDailyLife = ({ formData, updateForm, addItem, removeItem, updateItem, onNext, onPrev }: StepProps) => (
    <WizardLayout title="Vie Quotidienne" subtitle="Estimation des dépenses variables (Courses, Essence...)" icon={ShoppingCart}
        footer={<><Button variant="ghost" onClick={onPrev}>Retour</Button><Button onClick={onNext}>Patrimoine <ArrowRight className="ml-2" size={18}/></Button></>}>
        <div className="space-y-6">
            <div className="p-4 bg-yellow-50 rounded-xl text-sm text-yellow-800 mb-4 border border-yellow-100 flex items-start gap-3">
                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                <div>
                    <span className="font-bold block mb-1">Pas de date nécessaire</span>
                    Ces dépenses seront "lissées" sur tout le mois par notre algorithme (divisées par 30j) pour simuler une consommation réaliste.
                </div>
            </div>
            
            <AccordionSection mode="expert" defaultOpen={true} title="Courses & Alimentation" icon={ShoppingCart} colorClass="text-indigo-600" items={formData.variableCosts} onItemChange={(id: string, f: string, v: any) => updateItem!('variableCosts', id, f, v)} onItemAdd={() => addItem!('variableCosts')} onItemRemove={(id: string) => removeItem!('variableCosts', id)} />
            
            <div className="grid grid-cols-2 gap-3 mt-4">
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => updateForm({ ...formData, variableCosts: [...formData.variableCosts, { id: generateIdHelper(), name: 'Essence / Péage', amount: 0, frequency: 'mensuel' }] })}>
                    <Car className="mr-2" size={14} /> + Transport
                </Button>
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => updateForm({ ...formData, variableCosts: [...formData.variableCosts, { id: generateIdHelper(), name: 'Santé (Reste à charge)', amount: 0, frequency: 'mensuel' }] })}>
                    <HeartHandshake className="mr-2" size={14} /> + Santé
                </Button>
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => updateForm({ ...formData, variableCosts: [...formData.variableCosts, { id: generateIdHelper(), name: 'Animaux', amount: 0, frequency: 'mensuel' }] })}>
                    <User className="mr-2" size={14} /> + Animaux
                </Button>
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => updateForm({ ...formData, variableCosts: [...formData.variableCosts, { id: generateIdHelper(), name: 'Pause Dej / Cantine', amount: 0, frequency: 'mensuel' }] })}>
                    <Coffee className="mr-2" size={14} /> + Repas Midi
                </Button>
            </div>
        </div>
    </WizardLayout>
);

// ✅ STEP 5 : PATRIMOINE (REFAITE ET PROPRE)
const StepAssets = ({ formData, updateForm, addItem, removeItem, updateItem, onNext, onPrev }: StepProps) => {
  
    // MAPPING DES ICONES
    const ICON_MAPPING: Record<string, LucideIcon> = {
        cc: Wallet, pea: TrendingUp, av: ShieldCheck, cto: TrendingUp, per: PiggyBank,
        livret: Landmark, lep: Landmark, pel: Key, pee: Briefcase, immo_paper: Building2,
        crowd: Sprout, immo_phys: Building, crypto: Coins, gold: Gem
    };
  
    const hasAsset = (labelSubString: string) => {
      return formData.assetsUi.some(i => i.name.toLowerCase().includes(labelSubString.toLowerCase().split('/')[0].trim()));
    };
  
    const toggleAsset = (type: any) => {
      if (hasAsset(type.label)) return; 
      const newList = [
          ...formData.assetsUi, 
          { id: generateIdHelper(), name: type.label, type: type.id, stock: 0, monthlyFlow: 0, transferDay: 1 }
      ];
      updateForm({ ...formData, assetsUi: newList });
    };

    const updateAssetRow = (id: string, field: keyof AssetUiRow, value: any) => {
        const newList = formData.assetsUi.map(a => a.id === id ? { ...a, [field]: value } : a);
        updateForm({ ...formData, assetsUi: newList });
    };

    const removeAssetRow = (id: string) => {
        updateForm({ ...formData, assetsUi: formData.assetsUi.filter(a => a.id !== id) });
    };

    // Calcul du total affiché
    const totalAssets = formData.assetsUi.reduce((acc, item) => acc + (item.stock || 0), 0);

    return (
      <WizardLayout title="Votre Patrimoine" subtitle="Faisons l'inventaire complet (Comptes & Investissements)." icon={ShieldCheck}
        footer={<><Button variant="ghost" onClick={onPrev}>Retour</Button><Button onClick={onNext} className="w-full sm:w-auto" size="lg">Découvrir mon verdict <ArrowRight className="ml-2" size={18}/></Button></>}>
        
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            
            {/* 1. SÉLECTEUR */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Qu'est-ce que vous possédez ?</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ASSET_TYPES.map((type) => {
                      const isSelected = hasAsset(type.label);
                      const Icon = ICON_MAPPING[type.id] || TrendingUp;
                      return (
                          <button key={type.id} onClick={() => toggleAsset(type)} className={`relative p-3 rounded-xl border-2 text-left transition-all duration-200 group ${isSelected ? `${type.bg} ${type.border} ring-1 ring-offset-1 ring-indigo-100` : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md'}`}>
                              <div className="flex items-start justify-between mb-2">
                                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/80' : 'bg-slate-50'} ${type.color}`}><Icon size={18} /></div>
                                  {isSelected && <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white ${type.color}`}>AJOUTÉ</div>}
                              </div>
                              <div className={`font-bold text-sm ${isSelected ? 'text-slate-800' : 'text-slate-600'}`}>{type.label}</div>
                          </button>
                      );
                  })}
              </div>
            </div>

            {/* 2. LISTE ÉDITABLE */}
            {formData.assetsUi.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-white rounded-md shadow-sm text-slate-500"><TrendingUp size={16}/></div>
                        <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">Détail de vos comptes</span>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        {formData.assetsUi.map((item) => {
                            const isCC = item.type === 'cc' || item.name.toLowerCase().includes('courant');
                            return (
                                <div key={item.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-200 transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="font-bold text-slate-800 flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${isCC ? 'bg-slate-400' : 'bg-indigo-500'}`}/>
                                            {item.name}
                                        </div>
                                        {!isCC && (
                                            <button onClick={() => removeAssetRow(item.id)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                        )}
                                    </div>
                                    <div className={`grid ${isCC ? 'grid-cols-1' : 'grid-cols-12'} gap-4`}>
                                        {/* COLONNE 1 : STOCK (Solde) */}
                                        <div className={isCC ? 'col-span-1' : 'col-span-5'}>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Solde Actuel (Stock)</label>
                                            <div className="relative">
                                                <input type="number" className="block w-full rounded-lg border-slate-200 bg-slate-50 p-2 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:ring-indigo-500" placeholder="0" 
                                                    value={item.stock || ''} onChange={(e) => updateAssetRow(item.id, 'stock', parseFloat(e.target.value) || 0)} />
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"><span className="text-slate-400 text-xs">€</span></div>
                                            </div>
                                        </div>
                                        
                                        {/* COLONNE 2 : FLUX (Mensualité) - Caché pour CC */}
                                        {!isCC && (
                                            <>
                                                <div className="col-span-4">
                                                    <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Versement / Mois</label>
                                                    <div className="relative">
                                                        <input type="number" className="block w-full rounded-lg border-indigo-100 bg-indigo-50/50 p-2 text-sm font-bold text-indigo-900 focus:border-indigo-500 focus:ring-indigo-500" placeholder="0" 
                                                            value={item.monthlyFlow || ''} onChange={(e) => updateAssetRow(item.id, 'monthlyFlow', parseFloat(e.target.value) || 0)} />
                                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"><span className="text-indigo-400 text-xs">€</span></div>
                                                    </div>
                                                </div>
                                                <div className="col-span-3">
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Jour</label>
                                                    <div className="relative">
                                                        <input type="number" min="1" max="31" className="block w-full rounded-lg border-slate-200 bg-white p-2 text-sm font-medium text-slate-700 text-center" placeholder="1" 
                                                            value={item.transferDay || ''} onChange={(e) => updateAssetRow(item.id, 'transferDay', parseFloat(e.target.value) || 1)} />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    <Card className="p-4 bg-slate-900 text-white flex justify-between items-center rounded-xl shadow-lg shadow-slate-200/50">
                        <div className="flex flex-col">
                            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Patrimoine Total Estimé</span>
                            <span className="text-xs text-slate-500">Cash + Investissements</span>
                        </div>
                        <span className="text-2xl font-black">{formatCurrency(totalAssets)}</span>
                    </Card>
                </div>
            )}
        </div>
      </WizardLayout>
    );
};

const StepStrategy = ({ formData, onConfirm, isSaving, onPrev, stats }: StepProps) => {
    const [lifestyleInput, setLifestyleInput] = useState<string | number>('');

    useEffect(() => {
        if (formData.funBudget) setLifestyleInput(formData.funBudget);
    }, []);

    const theoreticalRest = stats ? Math.round(stats.remaining) : 0;
    const userLifestyle = parseNumber(lifestyleInput);
    const cashSavingsCapacity = theoreticalRest - userLifestyle;

    return (
        <WizardLayout title="Le Verdict" subtitle="C'est le moment de vérité." icon={Flag}
            footer={<><Button variant="ghost" onClick={onPrev}>Retour</Button><Button onClick={() => onConfirm!(userLifestyle, cashSavingsCapacity)} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white" size="lg">{isSaving ? <Loader2 className="animate-spin" /> : "Valider ma stratégie"}</Button></>}>
            <div className="space-y-8 animate-in zoom-in-95 duration-500">
                <div className="text-center p-6 bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-200">
                    <p className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-2">Disponible après TOUTES charges</p>
                    <div className="text-4xl md:text-5xl font-black text-white tracking-tight">{formatCurrency(theoreticalRest)}</div>
                    <p className="text-xs text-slate-500 mt-2">C'est votre argent pour le "Plaisir".</p>
                </div>
                <div className="relative"><div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-slate-200"></div></div><div className="relative flex justify-center"><span className="bg-white px-2 text-sm text-slate-500 font-medium">Répartition</span></div></div>
                <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 hover:border-indigo-200 transition-colors duration-300">
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Budget Plaisir Pur</label>
                            <div className="relative">
                                <input type="number" className="block w-full rounded-xl border-slate-200 bg-slate-50 p-4 pr-12 text-2xl font-bold text-slate-900 focus:border-indigo-500 focus:ring-indigo-500" placeholder="0" value={lifestyleInput} onChange={(e) => setLifestyleInput(getInputValue(e) as string)} />
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4"><span className="text-slate-400 font-bold">€</span></div>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">Resto, sorties, vacances, shopping...</p>
                        </div>
                        <div className="hidden md:block text-slate-300"><ArrowRight size={32} /></div>
                        <div className="flex-1 w-full text-center md:text-right">
                             <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Épargne de Sécurité</p>
                             <div className={`text-3xl font-black ${cashSavingsCapacity > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{cashSavingsCapacity > 0 ? '+' : ''}{formatCurrency(cashSavingsCapacity)}</div>
                             <p className="text-xs text-slate-400 mt-1">Cash disponible à la fin du mois</p>
                        </div>
                    </div>
                    {cashSavingsCapacity < 0 && (<div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-3 text-rose-700 text-sm font-medium animate-pulse"><AlertCircle size={20} />Attention, votre train de vie dépasse vos revenus disponibles.</div>)}
                </div>
            </div>
        </WizardLayout>
    );
};

// ============================================================================
// PAGE MAIN COMPONENT
// ============================================================================

export default function ProfilePage() {
  const { profile, saveProfile, isLoaded } = useFinancialData();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Initialisation : On convertit la DB (Profile) vers l'UI (FormProfile) via le Mapper
  useEffect(() => {
    if (isLoaded && profile) {
        // On vérifie si on doit mettre à jour le state local
        if (!formData || profile.updatedAt !== formData.updatedAt) {
             const cleanForm = mapProfileToForm(profile);
             setFormData(cleanForm);
        }
    }
  }, [isLoaded, profile]);

  // 2. Simulation Live : On convertit l'UI vers la DB pour nourrir le moteur
  const simulation = useMemo(() => {
    if (!formData) return null;
    const profileForEngine = mapFormToProfile(formData, 0); // Le lifestyle n'importe pas pour le budget brut
    return runSimulation(profileForEngine);
  }, [formData]);

  // 3. Stats pour le LiveSummary
  const wizardStats = useMemo(() => {
    if (!simulation || !formData) return null;

    const { budget } = simulation;
    // On calcule les investissements mensuels directement depuis notre UI propre
    const monthlyInvestments = formData.assetsUi
        .filter(a => a.type !== 'cc')
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

  const updateForm = (newData: FormProfile) => setFormData(newData);
  const goNext = () => { setCurrentStep(s => s + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goPrev = () => setCurrentStep(s => Math.max(1, s - 1));

  const updateItem = (list: keyof FormProfile, id: string, field: string, val: any) => {
    if (!formData) return;
    const currentList = formData[list] as FinancialItem[];
    updateForm({ ...formData, [list]: currentList.map((i) => i.id === id ? { ...i, [field]: val } : i) });
  };
  const addItem = (list: keyof FormProfile) => {
    if (!formData) return;
    const currentList = formData[list] as FinancialItem[];
    updateForm({ ...formData, [list]: [...currentList, { id: generateIdHelper(), name: '', amount: '', frequency: 'mensuel' }] });
  };
  const removeItem = (list: keyof FormProfile, id: string) => {
    if (!formData) return;
    const currentList = formData[list] as FinancialItem[];
    updateForm({ ...formData, [list]: currentList.filter((i) => i.id !== id) });
  };

  // ✅ SAUVEGARDE FINALE
  const handleSaveAndExit = async (lifestyle: number, savingsFromWizard: number) => {
    if (isSaving || !formData) return;
    setIsSaving(true);
    try {
        // On utilise le Mapper pour générer un profil propre pour la DB
        const finalProfile = mapFormToProfile(formData, lifestyle);
        await saveProfile(finalProfile);
        window.location.href = '/'; 
    } catch (e) { console.error(e); setIsSaving(false); alert("Erreur lors de la sauvegarde."); }
  };

  if (!isLoaded || !formData) return <div className="h-[50vh] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32}/></div>;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 pt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-xl mx-auto lg:mx-0">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest mb-2"><span>Progression</span><span>{Math.round(currentStep / 6 * 100)}%</span></div>
                <ProgressBar value={(currentStep / 6) * 100} className="h-2" />
            </div>

            <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-start">
                <div className="lg:col-span-7 xl:col-span-8">
                    {currentStep === 1 && <StepIdentite formData={formData} updateForm={updateForm} onNext={goNext} />}
                    {currentStep === 2 && <StepSituation formData={formData} updateForm={updateForm} onNext={goNext} onPrev={goPrev} />}
                    
                    {/* Step 3 : Fixe */}
                    {currentStep === 3 && <StepFixedFinances formData={formData} updateForm={updateForm} addItem={addItem} removeItem={removeItem} updateItem={updateItem} onNext={goNext} onPrev={goPrev} />}
                    
                    {/* Step 4 : Variable */}
                    {currentStep === 4 && <StepDailyLife formData={formData} updateForm={updateForm} addItem={addItem} removeItem={removeItem} updateItem={updateItem} onNext={goNext} onPrev={goPrev} />}
                    
                    {/* Step 5 : Patrimoine (CLEAN ARCHITECTURE) */}
                    {currentStep === 5 && <StepAssets formData={formData} updateForm={updateForm} addItem={addItem} removeItem={removeItem} updateItem={updateItem} onNext={goNext} onPrev={goPrev} />}
                    
                    {/* Step 6 : Verdict */}
                    {currentStep === 6 && <StepStrategy formData={formData} updateForm={updateForm} onConfirm={handleSaveAndExit} isSaving={isSaving} onPrev={goPrev} stats={wizardStats} />}
                </div>

                <div className="hidden lg:block lg:col-span-5 xl:col-span-4">
                    <LiveSummary formData={formData} stats={wizardStats!} currentStep={currentStep} />
                </div>
            </div>
        </div>
    </div>
  );
}