'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useFinancialData } from '@/app/hooks/useFinancialData';
// ✅ IMPORT DU MOTEUR DE CALCUL (ENGINE)
import { formatCurrency, generateId, computeFinancialPlan } from '@/app/lib/logic';

// --- TES COMPOSANTS UI ---
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
  HeartHandshake, Plus, Loader2, AlertCircle, User, ShieldCheck, Banknote
} from 'lucide-react';

// --- LOGIC HELPERS UI ---

// Helper de sécurité pour lire la valeur d'un input
const getInputValue = (e: any) => {
  if (e && e.target && typeof e.target.value !== 'undefined') return e.target.value; 
  return e; 
};

const parseNumber = (val: any) => {
  if (!val) return 0;
  return parseFloat(val.toString().replace(/\s/g, '').replace(',', '.')) || 0;
};
const generateIdHelper = () => Math.random().toString(36).substr(2, 9);

// ============================================================================
// 1. LAYOUT & COMPOSANTS VISUELS
// ============================================================================

const WizardLayout = ({ title, subtitle, icon: Icon, children, footer }: any) => (
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
// 2. RÉCAPITULATIF LIVE (Connecté à l'Engine)
// ============================================================================

const LiveSummary = ({ formData, budget, currentStep }: any) => {
  // On récupère les calculs directement depuis l'engine (budget)
  const income = budget?.monthlyIncome || 0;
  const fixed = budget?.mandatoryExpenses || 0;
  // Le reste à vivre est calculé par l'engine (capacityToSave + discretionaryExpenses)
  // Mais pour le wizard, on simplifie : Revenus - Charges Fixes
  const reste = Math.max(0, income - fixed);
  
  const ratio = budget?.engagementRate || 0;
  const ratioColor = ratio > 50 ? 'bg-orange-500' : ratio > 35 ? 'bg-yellow-500' : 'bg-emerald-500';
  const badgeColor = ratio > 50 ? 'text-orange-600 border-orange-200 bg-orange-50' : ratio > 35 ? 'text-yellow-600 border-yellow-200 bg-yellow-50' : 'text-emerald-600 border-emerald-200 bg-emerald-50';

  return (
    <div className="sticky top-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
      
      {/* Carte Identité */}
      <Card className="p-6 border-indigo-100 shadow-lg shadow-indigo-100/50 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-3 opacity-10">
          <User size={64} />
        </div>
        <div className="relative z-10">
          <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">Votre Profil</h3>
          <div className="text-2xl font-black text-slate-800 truncate">
            {formData.firstName || "Invité"}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
             {formData.age && <Badge variant="secondary" className="bg-slate-100 text-slate-600">{formData.age} ans</Badge>}
             {formData.persona && <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 capitalize">{formData.persona === 'salaried' ? 'Salarié' : formData.persona}</Badge>}
          </div>
        </div>

        {/* Détails foyer */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Home size={16}/></div>
                <div>
                    <div className="text-[10px] uppercase text-slate-400 font-bold">Logement</div>
                    <div className="text-sm font-bold text-slate-700 truncate">
                        {formData.housing?.status === 'tenant' ? 'Locataire' : 
                         formData.housing?.status?.includes('owner') ? 'Proprio' : 'Hébergé'}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><User size={16}/></div>
                <div>
                    <div className="text-[10px] uppercase text-slate-400 font-bold">Foyer</div>
                    <div className="text-sm font-bold text-slate-700">
                        {formData.household?.adults + (formData.household?.children || 0)} pers.
                    </div>
                </div>
            </div>
        </div>
      </Card>

      {/* Carte Budget Live */}
      {(currentStep >= 3 || income > 0) && (
          <Card className="p-6 border-slate-200 shadow-lg">
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Synthèse Mensuelle</h3>
                <Badge variant="outline" className={badgeColor}>
                    {Math.round(ratio)}% Charges
                </Badge>
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
                    <span className="text-slate-500 flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${ratioColor}`}/> Charges</span>
                    <span className="font-bold text-slate-900 text-rose-600">-{formatCurrency(fixed)}</span>
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-between items-center mt-3">
                    <span className="font-bold text-slate-700 uppercase text-xs">Reste à vivre</span>
                    <span className="font-black text-xl text-indigo-600">{formatCurrency(reste)}</span>
                </div>
             </div>
          </Card>
      )}
    </div>
  );
};

// ============================================================================
// 3. ÉTAPES DU WIZARD
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
            <InputGroup 
                label="Votre Prénom"
                placeholder="Ex: Thomas"
                value={formData.firstName || ''}
                onChange={(e: any) => updateForm({...formData, firstName: getInputValue(e)})}
                autoFocus
            />
            <div className={`transition-opacity duration-500 ${formData.firstName ? 'opacity-100' : 'opacity-30'}`}>
                <InputGroup 
                    label="Votre Âge"
                    type="number"
                    placeholder="30"
                    value={formData.age || ''}
                    onChange={(e: any) => updateForm({...formData, age: getInputValue(e)})}
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

const StepBudget = ({ formData, updateForm, addItem, removeItem, updateItem, onNext, onPrev }: any) => (
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

            {formData.housing?.status !== 'free' && formData.housing?.status !== 'owner_paid' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                     <InputGroup 
                        label={formData.housing?.status === 'tenant' ? "Loyer Mensuel" : "Mensualité Crédit"}
                        type="number"
                        placeholder="800"
                        value={formData.housing?.monthlyCost || ''}
                        onChange={(e: any) => updateForm({ ...formData, housing: { ...formData.housing, monthlyCost: parseNumber(getInputValue(e)) } })}
                        endAdornment={<span className="text-slate-400 font-bold px-3">€</span>}
                    />
                </div>
            )}

            <AccordionSection mode="expert" defaultOpen={false} title="Charges Fixes" icon={CreditCard} colorClass="text-slate-600" items={formData.fixedCosts} onItemChange={(id, f, v) => updateItem('fixedCosts', id, f, v)} onItemAdd={() => addItem('fixedCosts')} onItemRemove={(id) => removeItem('fixedCosts', id)} />
            <AccordionSection mode="expert" defaultOpen={false} title="Crédits Conso" icon={AlertCircle} colorClass="text-rose-500" items={formData.credits} onItemChange={(id, f, v) => updateItem('credits', id, f, v)} onItemAdd={() => addItem('credits')} onItemRemove={(id) => removeItem('credits', id)} />
        </div>
    </WizardLayout>
);

const StepAssets = ({ formData, updateForm, onConfirm, isSaving, onPrev, simulation }: any) => {
    const [sliderValue, setSliderValue] = useState(0);
    
    // On utilise les données de l'engine passées en props
    const theoreticalRest = Math.max(0, (simulation?.budget?.income || 0) - (simulation?.budget?.mandatoryExpenses || 0));
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
                        onChange={(e: any) => updateForm({ ...formData, currentBalance: parseNumber(getInputValue(e)) })}
                        endAdornment="€"
                    />
                    <InputGroup 
                        label="Épargne Totale"
                        type="number"
                        value={formData.savings || ''}
                        onChange={(e: any) => updateForm({ ...formData, savings: parseNumber(getInputValue(e)) })}
                        endAdornment="€"
                    />
                </div>

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

  useEffect(() => {
    if (isLoaded && profile && !formData) {
        const cleanProfile = JSON.parse(JSON.stringify(profile));
        ['incomes', 'fixedCosts', 'credits', 'subscriptions', 'investments'].forEach(k => { if(!cleanProfile[k]) cleanProfile[k] = []; });
        if (!cleanProfile.housing) cleanProfile.housing = { status: 'tenant', monthlyCost: 0, marketValue: 0 };
        setFormData(cleanProfile);
    }
  }, [isLoaded, profile]);

  // ✅ C'est ICI que la magie opère : On utilise l'ENGINE pour tout calculer
  const simulation = useMemo(() => {
    if (!formData) return null;
    return computeFinancialPlan(formData);
  }, [formData]);

  const updateForm = (newData: any) => setFormData(newData);
  const goNext = () => { setCurrentStep(s => s + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goPrev = () => setCurrentStep(s => Math.max(1, s - 1));

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
    <div className="min-h-screen bg-slate-50/50 pb-20 pt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="mb-8 max-w-xl mx-auto lg:mx-0">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                    <span>Progression</span>
                    <span>{currentStep * 25}%</span>
                </div>
                <ProgressBar value={(currentStep / 4) * 100} className="h-2" />
            </div>

            <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-start">
                
                {/* COLONNE GAUCHE */}
                <div className="lg:col-span-7 xl:col-span-8">
                    {currentStep === 1 && <StepIdentite formData={formData} updateForm={updateForm} onNext={goNext} />}
                    {currentStep === 2 && <StepSituation formData={formData} updateForm={updateForm} onNext={goNext} onPrev={goPrev} />}
                    {currentStep === 3 && (
                        <StepBudget 
                            formData={formData} updateForm={updateForm} 
                            addItem={addItem} removeItem={removeItem} updateItem={updateItem}
                            onNext={goNext} onPrev={goPrev}
                        />
                    )}
                    {currentStep === 4 && (
                        <StepAssets 
                            formData={formData} updateForm={updateForm} 
                            onConfirm={handleSaveAndExit} isSaving={isSaving} onPrev={goPrev}
                            simulation={simulation} // On passe la simulation complète
                        />
                    )}
                </div>

                {/* COLONNE DROITE : RÉCAP LIVE (Connecté à l'engine) */}
                <div className="hidden lg:block lg:col-span-5 xl:col-span-4">
                    <LiveSummary 
                        formData={formData} 
                        budget={simulation?.budget} // On passe le budget calculé par l'engine
                        currentStep={currentStep} 
                    />
                </div>

            </div>
        </div>
    </div>
  );
}