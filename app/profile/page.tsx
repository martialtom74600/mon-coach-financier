'use client';

import React, { useMemo, useState, useEffect, ReactNode } from 'react';
import { useFinancialData } from '@/app/hooks/useFinancialData';
// ✅ IMPORT DU MOTEUR & UTILITAIRES
import { formatCurrency, generateId, computeFinancialPlan, calculateListTotal } from '@/app/lib/logic';

// --- COMPOSANTS UI ---
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import InputGroup from '@/app/components/ui/InputGroup';
import ProgressBar from '@/app/components/ui/ProgressBar';
import Badge from '@/app/components/ui/Badge';

// --- COMPOSANT METIER ---
import AccordionSection from '@/app/components/AccordionSection';

// Icons
import {
  Wallet, Briefcase, GraduationCap, Armchair, Minus, CheckCircle,
  CreditCard, ArrowRight, Home, Building, Target,
  HeartHandshake, Plus, Loader2, AlertCircle, User, ShieldCheck, Banknote,
  Zap, Calendar, TrendingUp, Flag, LucideIcon
} from 'lucide-react';

// ============================================================================
// 0. DÉFINITION DES TYPES (POUR ARRÊTER LES ANY)
// ============================================================================

export interface FinancialItem {
  id: string;
  name: string;
  amount: number | string;
  frequency: string;
}

export interface FinancialProfile {
  firstName: string;
  age: number | string;
  persona: string;
  currentBalance: number;
  savings: number;
  investedAmount: number;
  funBudget: number;
  
  // Listes
  incomes: FinancialItem[];
  fixedCosts: FinancialItem[];
  credits: FinancialItem[];
  subscriptions: FinancialItem[];
  annualExpenses: FinancialItem[];
  investments: FinancialItem[]; // Utilisé comme flux mensuel dans le wizard

  housing: {
    status: string;
    monthlyCost: number;
  };
  household: {
    adults: number;
    children: number;
  };
}

// ============================================================================
// 1. HELPERS UI
// ============================================================================

const getInputValue = (e: React.ChangeEvent<HTMLInputElement> | string | number) => {
  if (typeof e === 'object' && e !== null && 'target' in e) return e.target.value;
  return e;
};

const parseNumber = (val: string | number | undefined): number => {
  if (!val) return 0;
  return parseFloat(val.toString().replace(/\s/g, '').replace(',', '.')) || 0;
};

const generateIdHelper = () => Math.random().toString(36).substr(2, 9);

// ============================================================================
// 2. LAYOUT & COMPOSANTS VISUELS
// ============================================================================

interface WizardLayoutProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  children: ReactNode;
  footer?: ReactNode;
}

const WizardLayout = ({ title, subtitle, icon: Icon, children, footer }: WizardLayoutProps) => (
  <div className="w-full max-w-2xl mx-auto lg:mx-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center lg:text-left mb-8">
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-4">
             <Icon size={28} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">{title}</h1>
          <p className="text-slate-500 text-lg max-w-md mx-auto lg:mx-0">{subtitle}</p>
      </div>

      <Card className="p-6 md:p-10 shadow-xl shadow-slate-200/40 border-slate-100">
          {children}
          {footer && (
             <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between gap-4">
                 {footer}
             </div>
          )}
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

const ToggleSwitch = ({ label, checked, onChange, icon: Icon }: any) => (
    <div onClick={() => onChange(!checked)} role="button" className={`cursor-pointer flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${checked ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${checked ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}><Icon size={20} /></div>
            <span className={`font-bold text-sm ${checked ? 'text-indigo-900' : 'text-slate-600'}`}>{label}</span>
        </div>
        <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
        </div>
    </div>
);

// ============================================================================
// 3. RÉCAPITULATIF LIVE (100% VISUEL, 0% CALCUL)
// ============================================================================

interface LiveSummaryProps {
    formData: FinancialProfile;
    stats: {
        income: number;
        fixed: number;
        investments: number;
        ratio: number;
        remaining: number;
    };
    currentStep: number;
}

const LiveSummary = ({ formData, stats, currentStep }: LiveSummaryProps) => {
  // Valeurs par défaut si stats n'est pas encore prêt
  const { income = 0, fixed = 0, investments = 0, ratio = 0, remaining = 0 } = stats || {};
  
  // Logique purement visuelle (Couleurs)
  const ratioColor = ratio > 50 ? 'bg-orange-500' : ratio > 35 ? 'bg-yellow-500' : 'bg-emerald-500';
  const badgeColor = ratio > 50 ? 'text-orange-600 border-orange-200 bg-orange-50' : ratio > 35 ? 'text-yellow-600 border-yellow-200 bg-yellow-50' : 'text-emerald-600 border-emerald-200 bg-emerald-50';

  return (
    <div className="sticky top-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
      
      {/* Carte Identité */}
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
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Home size={16}/></div>
                <div><div className="text-[10px] uppercase text-slate-400 font-bold">Logement</div><div className="text-sm font-bold text-slate-700 truncate">{formData.housing?.status === 'tenant' ? 'Locataire' : formData.housing?.status?.includes('owner') ? 'Proprio' : 'Hébergé'}</div></div>
            </div>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><User size={16}/></div>
                <div><div className="text-[10px] uppercase text-slate-400 font-bold">Foyer</div><div className="text-sm font-bold text-slate-700">{formData.household?.adults + (formData.household?.children || 0)} pers.</div></div>
            </div>
        </div>
      </Card>

      {/* Carte Budget Live */}
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
                {investments > 0 && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Investissements</span>
                        <span className="font-bold text-emerald-600">-{formatCurrency(investments)}</span>
                    </div>
                )}
                
                <div className="pt-3 border-t border-slate-100 flex justify-between items-center mt-3">
                    <span className="font-bold text-slate-700 uppercase text-xs">Reste à vivre</span>
                    <span className="font-black text-xl text-indigo-600">{formatCurrency(remaining)}</span>
                </div>
             </div>
          </Card>
      )}
    </div>
  );
};

// ============================================================================
// 4. ÉTAPES DU WIZARD
// ============================================================================

interface StepProps {
    formData: FinancialProfile;
    updateForm: (data: FinancialProfile) => void;
    onNext?: () => void;
    onPrev?: () => void;
    addItem?: (list: keyof FinancialProfile) => void;
    removeItem?: (list: keyof FinancialProfile, id: string) => void;
    updateItem?: (list: keyof FinancialProfile, id: string, field: string, val: any) => void;
    onConfirm?: (lifestyle: number, savings: number) => void;
    isSaving?: boolean;
    stats?: any; // Les stats pré-calculées
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
                    <SelectionTile icon={CheckCircle} title="Propriétaire" desc="Payé" selected={formData.housing?.status === 'owner_paid'} onClick={() => updateForm({ ...formData, housing: { ...formData.housing, status: 'owner_paid' } })} />
                    <SelectionTile icon={HeartHandshake} title="Gratuit" desc="Hébergé" selected={formData.housing?.status === 'free'} onClick={() => updateForm({ ...formData, housing: { ...formData.housing, status: 'free' } })} />
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

const StepBudget = ({ formData, updateForm, addItem, removeItem, updateItem, onNext, onPrev }: StepProps) => (
    <WizardLayout title="Vos Finances" subtitle="Vos flux mensuels (Net avant impôt)." icon={Wallet}
        footer={<><Button variant="ghost" onClick={onPrev}>Retour</Button><Button onClick={onNext}>Patrimoine <ArrowRight className="ml-2" size={18}/></Button></>}>
        <div className="space-y-6">
            <AccordionSection mode="expert" defaultOpen={true} title="Revenus (Net)" icon={Banknote} colorClass="text-emerald-600" items={formData.incomes} onItemChange={(id: string, f: string, v: any) => updateItem!('incomes', id, f, v)} onItemAdd={() => addItem!('incomes')} onItemRemove={(id: string) => removeItem!('incomes', id)} />
            {formData.housing?.status !== 'free' && formData.housing?.status !== 'owner_paid' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <InputGroup label={formData.housing?.status === 'tenant' ? "Loyer Mensuel" : "Mensualité Crédit"} type="number" placeholder="800" value={formData.housing?.monthlyCost || ''} onChange={(e: any) => updateForm({ ...formData, housing: { ...formData.housing, monthlyCost: parseNumber(getInputValue(e)) } })} endAdornment={<span className="text-slate-400 font-bold px-3">€</span>} />
                </div>
            )}
            <AccordionSection mode="expert" defaultOpen={false} title="Charges Fixes" icon={CreditCard} colorClass="text-slate-600" items={formData.fixedCosts} onItemChange={(id: string, f: string, v: any) => updateItem!('fixedCosts', id, f, v)} onItemAdd={() => addItem!('fixedCosts')} onItemRemove={(id: string) => removeItem!('fixedCosts', id)} />
            <AccordionSection mode="expert" defaultOpen={false} title="Abonnements" icon={Zap} colorClass="text-purple-500" items={formData.subscriptions} onItemChange={(id: string, f: string, v: any) => updateItem!('subscriptions', id, f, v)} onItemAdd={() => addItem!('subscriptions')} onItemRemove={(id: string) => removeItem!('subscriptions', id)} />
            <AccordionSection mode="expert" defaultOpen={false} title="Dépenses Annuelles" icon={Calendar} colorClass="text-orange-500" items={formData.annualExpenses} onItemChange={(id: string, f: string, v: any) => updateItem!('annualExpenses', id, f, v)} onItemAdd={() => addItem!('annualExpenses')} onItemRemove={(id: string) => removeItem!('annualExpenses', id)} />
            <AccordionSection mode="expert" defaultOpen={false} title="Crédits Conso" icon={AlertCircle} colorClass="text-rose-500" items={formData.credits} onItemChange={(id: string, f: string, v: any) => updateItem!('credits', id, f, v)} onItemAdd={() => addItem!('credits')} onItemRemove={(id: string) => removeItem!('credits', id)} />
        </div>
    </WizardLayout>
);

const StepAssets = ({ formData, updateForm, addItem, removeItem, updateItem, onNext, onPrev }: StepProps) => {
    const [isInvestor, setIsInvestor] = useState(false);
    useEffect(() => {
        const investmentList = Array.isArray(formData.investments) ? formData.investments : [];
        const hasInvestments = (investmentList.length > 0) || (formData.investedAmount > 0);
        setIsInvestor(hasInvestments);
    }, []);

    const handleInvestorToggle = (checked: boolean) => {
        setIsInvestor(checked);
        if (!checked) updateForm({ ...formData, investments: [], investedAmount: 0 });
    };

    return (
        <WizardLayout title="Votre Patrimoine" subtitle="Faisons le point sur ce que vous possédez." icon={ShieldCheck}
            footer={<><Button variant="ghost" onClick={onPrev}>Retour</Button><Button onClick={onNext} className="w-full sm:w-auto" size="lg">Découvrir mon verdict <ArrowRight className="ml-2" size={18}/></Button></>}>
            <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <InputGroup label="Compte Courant" type="number" value={formData.currentBalance || ''} onChange={(e: any) => updateForm({ ...formData, currentBalance: parseNumber(getInputValue(e)) })} endAdornment="€" />
                    <InputGroup label="Épargne de Précaution (Cash)" type="number" placeholder="Livrets..." value={formData.savings || ''} onChange={(e: any) => updateForm({ ...formData, savings: parseNumber(getInputValue(e)) })} endAdornment="€" />
                </div>
                <div className="pt-2">
                    <ToggleSwitch label="Je suis investisseur" icon={TrendingUp} checked={isInvestor} onChange={handleInvestorToggle} />
                    {isInvestor && (
                        <div className="mt-4 animate-in fade-in slide-in-from-top-2 space-y-6">
                            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                <InputGroup label="Capital Placé (Stock Total)" type="number" placeholder="PEA, Crypto, Immo..." value={formData.investedAmount || ''} onChange={(e: any) => updateForm({...formData, investedAmount: parseNumber(getInputValue(e))})} endAdornment="€" />
                            </div>
                            <AccordionSection mode="expert" defaultOpen={true} title="Investissements Mensuels (Flux)" icon={TrendingUp} colorClass="text-indigo-600" items={formData.investments} onItemChange={(id: string, f: string, v: any) => updateItem!('investments', id, f, v)} onItemAdd={() => addItem!('investments')} onItemRemove={(id: string) => removeItem!('investments', id)} />
                        </div>
                    )}
                </div>
            </div>
        </WizardLayout>
    );
};

// ✅ ÉTAPE 5 : STRATÉGIE (AFFICHAGE PUR)
const StepStrategy = ({ formData, onConfirm, isSaving, onPrev, stats }: StepProps) => {
    const [lifestyleInput, setLifestyleInput] = useState<string | number>('');

    useEffect(() => {
        if (formData.funBudget) setLifestyleInput(formData.funBudget);
    }, []);

    // 🚀 MAGIE : On utilise les données pré-calculées
    const theoreticalRest = stats ? Math.round(stats.remaining) : 0;
    
    // Seul calcul "UI" (Interaction immédiate)
    const userLifestyle = parseNumber(lifestyleInput);
    const cashSavingsCapacity = theoreticalRest - userLifestyle;

    return (
        <WizardLayout title="Le Verdict" subtitle="C'est le moment de vérité." icon={Flag}
            footer={<><Button variant="ghost" onClick={onPrev}>Retour</Button><Button onClick={() => onConfirm!(userLifestyle, cashSavingsCapacity)} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white" size="lg">{isSaving ? <Loader2 className="animate-spin" /> : "Valider ma stratégie"}</Button></>}>
            <div className="space-y-8 animate-in zoom-in-95 duration-500">
                <div className="text-center p-6 bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-200">
                    <p className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-2">Disponible après charges & Invest.</p>
                    <div className="text-4xl md:text-5xl font-black text-white tracking-tight">{formatCurrency(theoreticalRest)}</div>
                    <p className="text-xs text-slate-500 mt-2">C'est votre argent "libre".</p>
                </div>
                <div className="relative"><div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-slate-200"></div></div><div className="relative flex justify-center"><span className="bg-white px-2 text-sm text-slate-500 font-medium">Répartition</span></div></div>
                <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 hover:border-indigo-200 transition-colors duration-300">
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Budget Vie Courante & Plaisirs</label>
                            <div className="relative">
                                <input type="number" className="block w-full rounded-xl border-slate-200 bg-slate-50 p-4 pr-12 text-2xl font-bold text-slate-900 focus:border-indigo-500 focus:ring-indigo-500" placeholder="0" value={lifestyleInput} onChange={(e) => setLifestyleInput(getInputValue(e) as string)} />
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4"><span className="text-slate-400 font-bold">€</span></div>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">Alimentation, sorties, shopping, essence...</p>
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
  const [formData, setFormData] = useState<FinancialProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Initialisation (On fait confiance au Hook)
  useEffect(() => {
    if (isLoaded && profile && !formData) {
        setFormData(profile);
    }
  }, [isLoaded, profile]);

  // 2. 🧠 CALCUL DU PLAN FINANCIER (ENGINE)
  const simulation = useMemo(() => {
    if (!formData) return null;
    return computeFinancialPlan(formData);
  }, [formData]);

  // 3. 🎯 PRÉPARATION DES STATS POUR L'UI (BRIDGE ENGINE -> UI)
  const wizardStats = useMemo(() => {
    if (!simulation || !formData) return null;

    const { budget } = simulation;
    // L'Engine a calculé capacityToSave = income - fixed - livingExpenses.
    // Mais le LiveSummary a besoin de "Income - Fixed - Investments" pour afficher le Reste à Vivre avant vie courante.
    
    // On doit récupérer le flux mensuel d'investissement pour l'affichage live
    const monthlyInvestments = calculateListTotal(formData.investments || []);

    const totalEngaged = budget.mandatoryExpenses + monthlyInvestments;
    const ratio = budget.monthlyIncome > 0 ? (totalEngaged / budget.monthlyIncome) * 100 : 0;
    const remaining = Math.max(0, budget.monthlyIncome - totalEngaged);

    return {
        income: budget.monthlyIncome,
        fixed: budget.mandatoryExpenses,
        investments: monthlyInvestments,
        totalEngaged,
        ratio,
        remaining, // Reste avant Vie Courante
    };
  }, [simulation, formData]);

  const updateForm = (newData: FinancialProfile) => setFormData(newData);
  const goNext = () => { setCurrentStep(s => s + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goPrev = () => setCurrentStep(s => Math.max(1, s - 1));

  // Gestion Listes (Helper générique)
  const updateItem = (list: keyof FinancialProfile, id: string, field: string, val: any) => {
    if (!formData) return;
    const currentList = formData[list] as FinancialItem[];
    updateForm({ ...formData, [list]: currentList.map((i) => i.id === id ? { ...i, [field]: val } : i) });
  };
  const addItem = (list: keyof FinancialProfile) => {
    if (!formData) return;
    const currentList = formData[list] as FinancialItem[];
    updateForm({ ...formData, [list]: [...currentList, { id: generateIdHelper(), name: '', amount: '', frequency: 'mensuel' }] });
  };
  const removeItem = (list: keyof FinancialProfile, id: string) => {
    if (!formData) return;
    const currentList = formData[list] as FinancialItem[];
    updateForm({ ...formData, [list]: currentList.filter((i) => i.id !== id) });
  };

  // 4. SAUVEGARDE MANUELLE
  const handleSaveAndExit = async (lifestyle: number, savings: number) => {
    if (isSaving || !formData) return;
    setIsSaving(true);
    try {
        const finalData = { ...formData, funBudget: lifestyle, balanceDate: new Date().toISOString() };
        await saveProfile(finalData);
        window.location.href = '/'; 
    } catch { setIsSaving(false); alert("Erreur."); }
  };

  if (!isLoaded || !formData) return <div className="h-[50vh] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32}/></div>;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 pt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-xl mx-auto lg:mx-0">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest mb-2"><span>Progression</span><span>{currentStep * 20}%</span></div>
                <ProgressBar value={(currentStep / 5) * 100} className="h-2" />
            </div>

            <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-start">
                {/* GAUCHE : FORMULAIRES */}
                <div className="lg:col-span-7 xl:col-span-8">
                    {currentStep === 1 && <StepIdentite formData={formData} updateForm={updateForm} onNext={goNext} />}
                    {currentStep === 2 && <StepSituation formData={formData} updateForm={updateForm} onNext={goNext} onPrev={goPrev} />}
                    {currentStep === 3 && <StepBudget formData={formData} updateForm={updateForm} addItem={addItem} removeItem={removeItem} updateItem={updateItem} onNext={goNext} onPrev={goPrev} />}
                    {currentStep === 4 && <StepAssets formData={formData} updateForm={updateForm} addItem={addItem} removeItem={removeItem} updateItem={updateItem} onNext={goNext} onPrev={goPrev} />}
                    
                    {/* 👇 StepStrategy reçoit les stats calculées, il n'a plus besoin de 'simulation' brut */}
                    {currentStep === 5 && <StepStrategy formData={formData} updateForm={updateForm} onConfirm={handleSaveAndExit} isSaving={isSaving} onPrev={goPrev} stats={wizardStats} />}
                </div>

                {/* DROITE : RÉCAPITULATIF LIVE */}
                <div className="hidden lg:block lg:col-span-5 xl:col-span-4">
                    <LiveSummary formData={formData} stats={wizardStats!} currentStep={currentStep} />
                </div>
            </div>
        </div>
    </div>
  );
}