'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import { calculateFinancials, formatCurrency, generateId } from '@/app/lib/logic';

// --- TES COMPOSANTS EXISTANTS (D'après ton screenshot) ---
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import InputGroup from '@/app/components/ui/InputGroup'; // On l'utilise pour tous les champs
import ProgressBar from '@/app/components/ui/ProgressBar'; // Pour l'étape en cours
import Badge from '@/app/components/ui/Badge'; // Peut servir pour les tags

// --- COMPOSANT METIER ---
import AccordionSection from '@/app/components/AccordionSection';

// Icons
import {
  Wallet, Briefcase, GraduationCap, Armchair, Minus, CheckCircle,
  CreditCard, ArrowRight, ChevronLeft,
  TrendingUp, Target, Home, Building, HeartHandshake, Plus, Loader2,
  AlertCircle, User, ShieldCheck, Banknote
} from 'lucide-react';

// --- LOGIC HELPERS ---
const parseNumber = (val: any) => {
  if (!val) return 0;
  return parseFloat(val.toString().replace(/\s/g, '').replace(',', '.')) || 0;
};
const calculateListTotal = (list: any[]) => (list || []).reduce((acc, item) => acc + parseNumber(item.amount), 0);
const generateIdHelper = () => Math.random().toString(36).substr(2, 9);

// ============================================================================
// 1. LAYOUT UNIFIÉ (Utilise tes composants)
// ============================================================================

// Ce wrapper garantit que les 4 pages ont EXACTEMENT le même design
// en utilisant ton composant <Card> comme base.
const WizardLayout = ({ title, subtitle, icon: Icon, children, footer }: any) => (
  <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* En-tête Textuel */}
      <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-4">
             <Icon size={28} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">{title}</h1>
          <p className="text-slate-500 text-lg max-w-md mx-auto">{subtitle}</p>
      </div>

      {/* TA CARTE EXISTANTE qui sert de conteneur principal */}
      <Card className="p-6 md:p-10 shadow-xl shadow-slate-200/40 border-slate-100">
          {children}
          
          {/* Zone de boutons (Footer) */}
          {footer && (
             <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between gap-4">
                 {footer}
             </div>
          )}
      </Card>
  </div>
);

// Composant local pour les sélections (Tuiles)
// On essaye de le faire ressembler à ton InputGroup ou Card
const SelectionTile = ({ selected, onClick, icon: Icon, title, desc }: any) => (
  <div 
    onClick={onClick} 
    className={`
        cursor-pointer relative p-4 rounded-xl border-2 transition-all duration-200
        flex items-center gap-4 text-left
        ${selected 
            ? 'border-indigo-600 bg-indigo-50/50' 
            : 'border-slate-100 hover:border-slate-300 bg-white'
        }
    `}
  >
    <div className={`p-2.5 rounded-lg ${selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
        <Icon size={20} />
    </div>
    <div className="flex-1">
        <h3 className={`font-bold text-sm ${selected ? 'text-indigo-900' : 'text-slate-900'}`}>{title}</h3>
        <p className="text-xs text-slate-500">{desc}</p>
    </div>
    {selected && <CheckCircle className="text-indigo-600" size={18} />}
  </div>
);

// Compteur simple utilisant tes Buttons
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

// ============================================================================
// 2. ÉTAPES DU WIZARD
// ============================================================================

const StepIdentite = ({ formData, updateForm, onNext }: any) => (
    <WizardLayout 
        title="Qui êtes-vous ?" 
        subtitle="Ces infos calibrent nos projections."
        icon={User}
        footer={
            <Button onClick={onNext} disabled={!formData.firstName || !formData.age} className="w-full" size="lg">
                C'est parti <ArrowRight className="ml-2" size={18}/>
            </Button>
        }
    >
        <div className="space-y-6">
            {/* Utilisation de ton composant InputGroup */}
            <InputGroup 
                label="Votre Prénom"
                placeholder="Ex: Thomas"
                value={formData.firstName || ''}
                onChange={(e: any) => updateForm({...formData, firstName: e.target.value})}
                autoFocus
            />
            
            <div className={`transition-opacity duration-500 ${formData.firstName ? 'opacity-100' : 'opacity-30'}`}>
                <InputGroup 
                    label="Votre Âge"
                    type="number"
                    placeholder="30"
                    value={formData.age || ''}
                    onChange={(e: any) => updateForm({...formData, age: e.target.value})}
                    endAdornment={<span className="text-slate-400 font-bold px-3">ans</span>}
                />
            </div>
        </div>
    </WizardLayout>
);

const StepSituation = ({ formData, updateForm, onNext, onPrev }: any) => (
    <WizardLayout 
        title="Votre Situation" 
        subtitle="Adaptons la stratégie à votre profil."
        icon={Briefcase}
        footer={
            <>
                <Button variant="ghost" onClick={onPrev}>Retour</Button>
                <Button onClick={onNext}>Continuer <ArrowRight className="ml-2" size={18}/></Button>
            </>
        }
    >
        <div className="space-y-8">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Statut Pro</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SelectionTile icon={Briefcase} title="Salarié" desc="CDI / CDD" selected={formData.persona === 'salaried'} onClick={() => updateForm({ ...formData, persona: 'salaried' })} />
                    <SelectionTile icon={Target} title="Indépendant" desc="Freelance" selected={formData.persona === 'freelance'} onClick={() => updateForm({ ...formData, persona: 'freelance' })} />
                    <SelectionTile icon={GraduationCap} title="Étudiant" desc="Études" selected={formData.persona === 'student'} onClick={() => updateForm({ ...formData, persona: 'student' })} />
                    <SelectionTile icon={Armchair} title="Retraité" desc="Pension" selected={formData.persona === 'retired'} onClick={() => updateForm({ ...formData, persona: 'retired' })} />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Logement</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SelectionTile icon={Building} title="Locataire" desc="Loyer" selected={formData.housing?.status === 'tenant'} onClick={() => updateForm({ ...formData, housing: { ...formData.housing, status: 'tenant' } })} />
                    <SelectionTile icon={Home} title="Propriétaire" desc="Crédit" selected={formData.housing?.status === 'owner_loan'} onClick={() => updateForm({ ...formData, housing: { ...formData.housing, status: 'owner_loan' } })} />
                    <SelectionTile icon={CheckCircle} title="Propriétaire" desc="Payé" selected={formData.housing?.status === 'owner_paid'} onClick={() => updateForm({ ...formData, housing: { ...formData.housing, status: 'owner_paid' } })} />
                    <SelectionTile icon={HeartHandshake} title="Gratuit" desc="Hébergé" selected={formData.housing?.status === 'free'} onClick={() => updateForm({ ...formData, housing: { ...formData.housing, status: 'free' } })} />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Foyer</label>
                <div className="flex gap-4">
                    <CounterControl label="Adultes" value={formData.household?.adults || 1} onChange={(v:any) => updateForm({ ...formData, household: {...formData.household, adults: v}})} />
                    <CounterControl label="Enfants" value={formData.household?.children || 0} onChange={(v:any) => updateForm({ ...formData, household: {...formData.household, children: v}})} />
                </div>
            </div>
        </div>
    </WizardLayout>
);

const StepBudget = ({ formData, updateForm, addItem, removeItem, updateItem, onNext, onPrev, stats }: any) => (
    <WizardLayout 
        title="Vos Finances" 
        subtitle="Vos flux mensuels (Net avant impôt)."
        icon={Wallet}
        footer={
            <>
                <Button variant="ghost" onClick={onPrev}>Retour</Button>
                <Button onClick={onNext}>Patrimoine <ArrowRight className="ml-2" size={18}/></Button>
            </>
        }
    >
        <div className="space-y-6">
            <AccordionSection mode="expert" defaultOpen={true} title="Revenus (Net)" icon={Banknote} colorClass="text-emerald-600" items={formData.incomes} onItemChange={(id, f, v) => updateItem('incomes', id, f, v)} onItemAdd={() => addItem('incomes')} onItemRemove={(id) => removeItem('incomes', id)} />

            {/* Input Spécial Logement */}
            {formData.housing?.status !== 'free' && formData.housing?.status !== 'owner_paid' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                     <InputGroup 
                        label={formData.housing?.status === 'tenant' ? "Loyer Mensuel" : "Mensualité Crédit"}
                        type="number"
                        placeholder="800"
                        value={formData.housing?.monthlyCost || ''}
                        onChange={(e: any) => updateForm({ ...formData, housing: { ...formData.housing, monthlyCost: parseNumber(e.target.value) } })}
                        endAdornment={<span className="text-slate-400 font-bold px-3">€</span>}
                    />
                </div>
            )}

            <AccordionSection mode="expert" defaultOpen={false} title="Charges Fixes" icon={CreditCard} colorClass="text-slate-600" items={formData.fixedCosts} onItemChange={(id, f, v) => updateItem('fixedCosts', id, f, v)} onItemAdd={() => addItem('fixedCosts')} onItemRemove={(id) => removeItem('fixedCosts', id)} />
            <AccordionSection mode="expert" defaultOpen={false} title="Crédits Conso" icon={AlertCircle} colorClass="text-rose-500" items={formData.credits} onItemChange={(id, f, v) => updateItem('credits', id, f, v)} onItemAdd={() => addItem('credits')} onItemRemove={(id) => removeItem('credits', id)} />
        </div>
    </WizardLayout>
);

const StepAssets = ({ formData, updateForm, onConfirm, isSaving, onPrev }: any) => {
    const [sliderValue, setSliderValue] = useState(0);
    const stats = calculateFinancials(formData);
    const theoreticalRest = Math.max(0, stats.monthlyIncome - stats.mandatoryExpenses);
    const displayRest = theoreticalRest - sliderValue;

    return (
        <WizardLayout 
            title="Dernière Étape" 
            subtitle="Patrimoine actuel & Capacité d'épargne."
            icon={ShieldCheck}
            footer={
                <>
                    <Button variant="ghost" onClick={onPrev}>Retour</Button>
                    <Button onClick={() => onConfirm(displayRest, sliderValue)} className="w-full sm:w-auto" size="lg">
                        {isSaving ? <Loader2 className="animate-spin" /> : "Terminer"}
                    </Button>
                </>
            }
        >
            <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <InputGroup 
                        label="Compte Courant"
                        type="number"
                        value={formData.currentBalance || ''}
                        onChange={(e: any) => updateForm({ ...formData, currentBalance: parseNumber(e.target.value) })}
                        endAdornment="€"
                    />
                    <InputGroup 
                        label="Épargne Totale"
                        type="number"
                        value={formData.savings || ''}
                        onChange={(e: any) => updateForm({ ...formData, savings: parseNumber(e.target.value) })}
                        endAdornment="€"
                    />
                </div>

                {/* Slider personnalisé pour la répartition */}
                <div className="pt-8 border-t border-slate-50">
                    <div className="text-center mb-6">
                         <h3 className="font-bold text-slate-900">Répartition Reste à Vivre</h3>
                         <Badge variant="outline" className="mt-2">{formatCurrency(theoreticalRest)} dispo</Badge>
                    </div>
                    
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                        <input 
                            type="range" min="0" max={theoreticalRest} step="10" 
                            value={sliderValue} onChange={(e) => setSliderValue(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mb-6"
                        />
                        <div className="flex justify-between items-center">
                             <div className="text-center">
                                 <div className="text-[10px] font-bold text-slate-400 uppercase">Plaisirs</div>
                                 <div className="text-xl font-bold text-slate-900">{formatCurrency(displayRest)}</div>
                             </div>
                             <div className="text-center">
                                 <div className="text-[10px] font-bold text-emerald-600 uppercase">Épargne</div>
                                 <div className="text-xl font-bold text-emerald-600">{formatCurrency(sliderValue)}</div>
                             </div>
                        </div>
                    </div>
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
  const [formData, setFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialisation
  useEffect(() => {
    if (isLoaded && profile && !formData) {
        const cleanProfile = JSON.parse(JSON.stringify(profile));
        ['incomes', 'fixedCosts', 'credits', 'subscriptions'].forEach(k => { if(!cleanProfile[k]) cleanProfile[k] = []; });
        if (!cleanProfile.housing) cleanProfile.housing = { status: 'tenant', monthlyCost: 0, marketValue: 0 };
        setFormData(cleanProfile);
    }
  }, [isLoaded, profile]);

  const stats = useMemo(() => {
    if (!formData) return { monthlyIncome: 0, mandatoryExpenses: 0 };
    const simulatedFixedCosts = [...formData.fixedCosts];
    if (formData.housing?.monthlyCost > 0) {
        simulatedFixedCosts.push({ id: 'housing_calc', name: 'Logement', amount: formData.housing.monthlyCost });
    }
    return calculateFinancials({ ...formData, fixedCosts: simulatedFixedCosts });
  }, [formData]);

  const updateForm = (newData: any) => setFormData(newData);
  const goNext = () => { setCurrentStep(s => s + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goPrev = () => setCurrentStep(s => Math.max(1, s - 1));

  // Helpers Listes
  const updateItem = (list: string, id: string, field: string, val: any) => {
    const newList = (formData[list]||[]).map((i:any) => i.id === id ? { ...i, [field]: val } : i);
    updateForm({ ...formData, [list]: newList });
  };
  const addItem = (list: string) => updateForm({ ...formData, [list]: [...(formData[list]||[]), { id: generateIdHelper(), name: '', amount: '', frequency: 'mensuel' }] });
  const removeItem = (list: string, id: string) => updateForm({ ...formData, [list]: (formData[list]||[]).filter((i:any) => i.id !== id) });

  const handleSaveAndExit = async (lifestyle: number, savings: number) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
        const finalData = { 
            ...formData, 
            foodBudget: Math.round(lifestyle * 0.6), 
            funBudget: Math.round(lifestyle * 0.4),
            balanceDate: new Date().toISOString() 
        };
        await saveProfile(finalData, true);
        window.location.href = '/'; 
    } catch { setIsSaving(false); alert("Erreur."); }
  };

  if (!isLoaded || !formData) return <div className="h-[50vh] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32}/></div>;

  return (
    <div className="w-full pb-10">
        
        {/* Utilisation de TON composant ProgressBar */}
        <div className="mb-8 max-w-xs mx-auto">
            <ProgressBar value={(currentStep / 4) * 100} className="h-2" />
            <div className="text-center text-xs text-slate-400 mt-2 font-medium uppercase tracking-widest">
                Étape {currentStep} / 4
            </div>
        </div>

        {currentStep === 1 && <StepIdentite formData={formData} updateForm={updateForm} onNext={goNext} />}
        {currentStep === 2 && <StepSituation formData={formData} updateForm={updateForm} onNext={goNext} onPrev={goPrev} />}
        {currentStep === 3 && (
            <StepBudget 
                formData={formData} updateForm={updateForm} 
                addItem={addItem} removeItem={removeItem} updateItem={updateItem}
                onNext={goNext} onPrev={goPrev}
                stats={stats}
            />
        )}
        {currentStep === 4 && (
            <StepAssets 
                formData={formData} updateForm={updateForm} 
                onConfirm={handleSaveAndExit} isSaving={isSaving} onPrev={goPrev}
            />
        )}
    </div>
  );
}