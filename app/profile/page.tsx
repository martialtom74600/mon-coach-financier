'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import {
  calculateFinancials, formatCurrency, generateId, PERSONA_PRESETS
} from '@/app/lib/logic';

import AccordionSection from '@/app/components/AccordionSection';

// Icons
import {
  Wallet, User, Briefcase, GraduationCap, Armchair, Minus, CheckCircle,
  Info, CreditCard, PiggyBank, ArrowRight, ChevronLeft,
  Zap, Shield, Plus, Loader2, TrendingUp, Target, 
  Home, Building, HeartHandshake, Scale, Sparkles, X, Check
} from 'lucide-react';

import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';

// --- STYLES & ANIMATIONS ---
// J'ajoute des classes utilitaires pour l'animation directement ici pour garantir l'effet "Woaw"
const FADE_IN = "animate-in fade-in slide-in-from-bottom-4 duration-700";
const HOVER_SCALE = "transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]";

// --- COMPOSANTS UX PREMIUM ---

// 1. INPUT GÉANT (Pour les montants principaux)
const JumboInput = ({ value, onChange, label, subLabel }: any) => (
  <div className="text-center py-6 group">
    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-500 transition-colors">
      {label}
    </label>
    <div className="relative inline-block max-w-full">
      <input
        type="text"
        value={value === 0 ? '' : value}
        onChange={onChange}
        placeholder="0"
        className="w-full bg-transparent text-5xl md:text-7xl font-black text-slate-900 text-center outline-none placeholder:text-slate-200"
      />
      <span className="absolute -right-8 top-2 text-2xl text-slate-400 font-bold">€</span>
    </div>
    {subLabel && <p className="text-sm text-slate-400 mt-2 font-medium">{subLabel}</p>}
  </div>
);

// 2. CARTE DE SÉLECTION (Interactive)
const SelectionTile = ({ selected, onClick, icon: Icon, title, desc }: any) => (
  <button
    onClick={onClick}
    className={`relative w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 ${
      selected 
        ? 'border-indigo-600 bg-indigo-50/50 shadow-lg shadow-indigo-100 ring-1 ring-indigo-600 scale-[1.02]' 
        : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-md'
    }`}
  >
    <div className="flex items-start gap-4">
      <div className={`p-3 rounded-xl transition-colors ${selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
        <Icon size={24} strokeWidth={selected ? 2.5 : 2} />
      </div>
      <div className="flex-1">
        <h3 className={`font-bold text-lg ${selected ? 'text-indigo-900' : 'text-slate-800'}`}>{title}</h3>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{desc}</p>
      </div>
      {selected && (
        <div className="absolute top-6 right-6 text-indigo-600 animate-in zoom-in duration-300">
          <CheckCircle size={24} fill="currentColor" className="text-white" />
        </div>
      )}
    </div>
  </button>
);

// 3. BARRE DE PROGRESSION ÉLÉGANTE
const PremiumProgressBar = ({ step, total }: { step: number, total: number }) => (
  <div className="flex gap-2 mb-8">
    {Array.from({ length: total }).map((_, i) => (
      <div 
        key={i} 
        className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${
          i + 1 <= step ? 'bg-indigo-600' : 'bg-slate-100'
        }`} 
      />
    ))}
  </div>
);

// --- LOGIC HELPERS ---
const parseNumber = (val: any) => {
  if (!val) return 0;
  return parseFloat(val.toString().replace(/\s/g, '').replace(',', '.')) || 0;
};
const calculateListTotal = (list: any[]) => (list || []).reduce((acc, item) => acc + parseNumber(item.amount), 0);

// ============================================================================
// SOUS-COMPOSANT : KYC WIZARD (L'expérience immersive)
// ============================================================================
const KYCStep = ({ formData, updateForm, onNext }: any) => {
    const [subStep, setSubStep] = useState(1);

    const next = () => setSubStep(s => s + 1);
    const back = () => setSubStep(s => s - 1);

    // Écran 1 : Prénom & Age (Focus Humain)
    if (subStep === 1) return (
        <div className={`max-w-xl mx-auto text-center ${FADE_IN}`}>
            <div className="mb-8 inline-block p-4 rounded-full bg-gradient-to-br from-indigo-100 to-purple-50 text-indigo-600 shadow-sm">
                <Sparkles size={40} />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">Enchanté, c'est quoi votre petit nom ?</h2>
            <p className="text-slate-500 text-lg mb-12">Juste pour que ce soit plus sympa entre nous.</p>
            
            <div className="space-y-8">
                <input 
                    autoFocus
                    type="text" 
                    placeholder="Votre Prénom" 
                    value={formData.firstName || ''}
                    onChange={(e) => updateForm({...formData, firstName: e.target.value})}
                    className="w-full text-center text-4xl font-bold border-b-2 border-slate-200 focus:border-indigo-600 outline-none pb-4 bg-transparent placeholder:text-slate-200 transition-all"
                />
                
                {formData.firstName && (
                    <div className="animate-in slide-in-from-bottom-2 fade-in">
                        <p className="text-slate-400 mb-4 text-sm font-medium uppercase tracking-wide">Et votre âge ?</p>
                        <input 
                            type="number" 
                            placeholder="30" 
                            value={formData.age || ''}
                            onChange={(e) => updateForm({...formData, age: e.target.value})}
                            className="w-24 text-center text-3xl font-bold border-2 border-slate-100 rounded-xl focus:border-indigo-600 outline-none p-3 bg-white"
                        />
                    </div>
                )}
            </div>

            <div className="mt-12">
                <Button 
                    onClick={next} 
                    disabled={!formData.firstName || !formData.age}
                    className="w-full md:w-auto px-12 py-4 bg-slate-900 text-white rounded-full text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Continuer <ArrowRight className="ml-2" />
                </Button>
            </div>
        </div>
    );

    // Écran 2 : Job (Grid layout)
    if (subStep === 2) return (
        <div className={`max-w-2xl mx-auto ${FADE_IN}`}>
            <button onClick={back} className="mb-6 text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm font-bold"><ChevronLeft size={16}/> Retour</button>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Votre quotidien pro ?</h2>
            <p className="text-slate-500 text-lg mb-8">Pour comprendre la stabilité de vos revenus.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectionTile icon={Briefcase} title="Salarié / Cadre" desc="Revenus stables (CDI, CDD, Fonctionnaire)" selected={formData.persona === 'salaried'} onClick={() => { updateForm({ ...formData, persona: 'salaried' }); next(); }} />
                <SelectionTile icon={Target} title="Indépendant" desc="Freelance, Artisan, Chef d'entreprise" selected={formData.persona === 'freelance'} onClick={() => { updateForm({ ...formData, persona: 'freelance' }); next(); }} />
                <SelectionTile icon={GraduationCap} title="Étudiant" desc="Budget serré, avenir à construire" selected={formData.persona === 'student'} onClick={() => { updateForm({ ...formData, persona: 'student' }); next(); }} />
                <SelectionTile icon={Armchair} title="Retraité" desc="Revenus de pension, gestion de capital" selected={formData.persona === 'retired'} onClick={() => { updateForm({ ...formData, persona: 'retired' }); next(); }} />
            </div>
        </div>
    );

    // Écran 3 : Logement (Focus vertical)
    if (subStep === 3) return (
        <div className={`max-w-2xl mx-auto ${FADE_IN}`}>
            <button onClick={back} className="mb-6 text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm font-bold"><ChevronLeft size={16}/> Retour</button>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Votre toit 🏠</h2>
            <p className="text-slate-500 text-lg mb-8">C'est souvent le premier poste de dépense (ou d'épargne).</p>
            
            <div className="space-y-4">
                <SelectionTile icon={Building} title="Locataire" desc="Je verse un loyer à un propriétaire." selected={formData.housing?.status === 'tenant'} onClick={() => { updateForm({ ...formData, housing: { ...formData.housing, status: 'tenant' } }); next(); }} />
                <SelectionTile icon={Home} title="Propriétaire (Crédit)" desc="Je rembourse ma banque chaque mois." selected={formData.housing?.status === 'owner_loan'} onClick={() => { updateForm({ ...formData, housing: { ...formData.housing, status: 'owner_loan' } }); next(); }} />
                <SelectionTile icon={CheckCircle} title="Propriétaire (Payé)" desc="La maison est 100% à moi." selected={formData.housing?.status === 'owner_paid'} onClick={() => { updateForm({ ...formData, housing: { ...formData.housing, status: 'owner_paid' } }); next(); }} />
                <SelectionTile icon={HeartHandshake} title="Logé gratuitement" desc="Parents, logement de fonction..." selected={formData.housing?.status === 'free'} onClick={() => { updateForm({ ...formData, housing: { ...formData.housing, status: 'free' } }); next(); }} />
            </div>
        </div>
    );

    // Écran 4 : Expert & Foyer
    if (subStep === 4) return (
        <div className={`max-w-2xl mx-auto ${FADE_IN}`}>
            <button onClick={back} className="mb-6 text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm font-bold"><ChevronLeft size={16}/> Retour</button>
            <h2 className="text-3xl font-black text-slate-900 mb-8">Derniers détails...</h2>
            
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl mb-8">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 block">Votre Foyer</label>
                <div className="flex gap-6 items-center justify-center">
                     <div className="text-center">
                        <div className="text-4xl font-black text-slate-800 mb-2">{formData.household?.adults || 1}</div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => updateForm({ ...formData, household: {...formData.household, adults: Math.max(1, (formData.household?.adults||1)-1)}})} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold transition-colors"><Minus size={14}/></button>
                            <span className="text-xs font-bold text-slate-500 uppercase">Adultes</span>
                            <button onClick={() => updateForm({ ...formData, household: {...formData.household, adults: (formData.household?.adults||1)+1}})} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold transition-colors"><Plus size={14}/></button>
                        </div>
                     </div>
                     <div className="w-px h-16 bg-slate-100"></div>
                     <div className="text-center">
                        <div className="text-4xl font-black text-slate-800 mb-2">{formData.household?.children || 0}</div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => updateForm({ ...formData, household: {...formData.household, children: Math.max(0, (formData.household?.children||0)-1)}})} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold transition-colors"><Minus size={14}/></button>
                            <span className="text-xs font-bold text-slate-500 uppercase">Enfants</span>
                            <button onClick={() => updateForm({ ...formData, household: {...formData.household, children: (formData.household?.children||0)+1}})} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold transition-colors"><Plus size={14}/></button>
                        </div>
                     </div>
                </div>
            </div>

            <div className="space-y-4">
                 <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Votre niveau d'investissement</p>
                 <SelectionTile icon={PiggyBank} title="Épargnant Prudent" desc="Je veux juste sécuriser mon avenir (Livrets)." selected={formData.mode === 'beginner'} onClick={() => updateForm({ ...formData, mode: 'beginner' })} />
                 <SelectionTile icon={TrendingUp} title="Investisseur" desc="J'ai (ou je veux) des actifs dynamiques (Bourse, Immo...)." selected={formData.mode === 'expert'} onClick={() => updateForm({ ...formData, mode: 'expert' })} />
            </div>

            <div className="mt-12">
                <Button onClick={onNext} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-lg shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all transform hover:-translate-y-1">
                    Valider mon Profil <Check className="ml-2" />
                </Button>
            </div>
        </div>
    );
    return null;
};

// ============================================================================
// PAGE PRINCIPALE
// ============================================================================

export default function ProfilePage() {
  const { profile, saveProfile, isLoaded } = useFinancialData();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isExpert = formData?.mode === 'expert';

  // --- INITIALISATION ---
  useEffect(() => {
    if (isLoaded && profile && !formData) {
        const cleanProfile = JSON.parse(JSON.stringify(profile));
        ['incomes', 'fixedCosts', 'credits', 'subscriptions', 'savingsContributions'].forEach(k => { if(!cleanProfile[k]) cleanProfile[k] = []; });
        if (!cleanProfile.housing) cleanProfile.housing = { status: 'tenant', monthlyCost: 0, marketValue: 0 };
        if (!cleanProfile.mode) cleanProfile.mode = 'beginner'; 
        setFormData(cleanProfile);
    }
  }, [isLoaded, profile]);

  // --- STATS TEMPS RÉEL (Pour la sidebar) ---
  const stats = useMemo(() => {
    if (!formData) return null;
    const simulatedFixedCosts = [...formData.fixedCosts];
    if (formData.housing?.monthlyCost > 0) {
        simulatedFixedCosts.push({ id: 'housing_calc', name: 'Logement', amount: formData.housing.monthlyCost });
    }
    return calculateFinancials({ ...formData, fixedCosts: simulatedFixedCosts });
  }, [formData]);

  const updateForm = (newData: any) => setFormData(newData);
  const goNext = () => { setCurrentStep(s => s + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goPrev = () => setCurrentStep(s => Math.max(1, s - 1));

  // --- HELPERS CRUD ---
  const updateItem = (list: string, id: string, field: string, val: any) => {
    const newList = (formData[list]||[]).map((i:any) => i.id === id ? { ...i, [field]: val } : i);
    updateForm({ ...formData, [list]: newList });
  };
  const addItem = (list: string) => updateForm({ ...formData, [list]: [...(formData[list]||[]), { id: generateId(), name: '', amount: '', frequency: 'mensuel' }] });
  const removeItem = (list: string, id: string) => updateForm({ ...formData, [list]: (formData[list]||[]).filter((i:any) => i.id !== id) });

  // --- SAVE ---
  const handleSaveAndExit = async (forcedData?: any) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
        await saveProfile({ ...(forcedData || formData), balanceDate: new Date().toISOString() }, true);
        window.location.href = '/'; 
    } catch { setIsSaving(false); alert("Oups, erreur de sauvegarde."); }
  };

  if (!isLoaded || !formData || !stats) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="flex flex-col items-center gap-4"><Loader2 className="animate-spin text-indigo-600" size={40}/><p className="text-slate-400 font-medium animate-pulse">Chargement de votre profil...</p></div></div>;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
        
        {/* TOP BAR (Minimaliste) */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {currentStep > 1 && (
                        <button onClick={goPrev} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    <span className="font-bold text-slate-900">
                        {currentStep === 1 ? 'Introduction' : 
                         currentStep === 2 ? 'Flux Mensuels' : 
                         currentStep === 3 ? 'Patrimoine' : 'Bilan'}
                    </span>
                </div>
                <div className="flex gap-1">
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} className={`h-1.5 w-8 rounded-full transition-all duration-500 ${s <= currentStep ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                    ))}
                </div>
            </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 pt-12 grid grid-cols-1 lg:grid-cols-12 gap-12">

            {/* MAIN CONTENT */}
            <div className={`${currentStep === 1 ? 'lg:col-span-12' : 'lg:col-span-8'} transition-all duration-500`}>
                
                {/* --- ETAPE 1 : KYC --- */}
                {currentStep === 1 && <KYCStep formData={formData} updateForm={updateForm} onNext={goNext} />}

                {/* --- ETAPE 2 : BUDGET --- */}
                {currentStep === 2 && (
                    <div className={FADE_IN}>
                        <div className="mb-8">
                            <h1 className="text-3xl font-black text-slate-900 mb-2">Votre Structure Budgétaire</h1>
                            <p className="text-slate-500">Concentrons-nous uniquement sur le <strong>fixe et le contraint</strong>.</p>
                        </div>

                        {/* CHARGE LOGEMENT : Le "Jumbo Input" */}
                        {formData.housing?.status !== 'free' && formData.housing?.status !== 'owner_paid' && (
                            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl mb-8 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                                <JumboInput 
                                    label={formData.housing?.status === 'tenant' ? "Votre Loyer (Charges Comprises)" : "Votre Mensualité de Crédit"}
                                    value={formData.housing?.monthlyCost}
                                    onChange={(e: any) => updateForm({ ...formData, housing: { ...formData.housing, monthlyCost: parseNumber(e.target.value) } })}
                                    subLabel="C'est votre charge la plus importante."
                                />
                            </div>
                        )}

                        <div className="space-y-6">
                            <AccordionSection mode="expert" defaultOpen={true} title="Revenus (Net avant impôt)" icon={Wallet} colorClass="text-emerald-600" items={formData.incomes} onItemChange={(id, f, v) => updateItem('incomes', id, f, v)} onItemAdd={() => addItem('incomes')} onItemRemove={(id) => removeItem('incomes', id)} />
                            <AccordionSection mode="expert" defaultOpen={false} title="Charges Fixes (Factures)" icon={CreditCard} colorClass="text-slate-600" items={formData.fixedCosts} onItemChange={(id, f, v) => updateItem('fixedCosts', id, f, v)} onItemAdd={() => addItem('fixedCosts')} onItemRemove={(id) => removeItem('fixedCosts', id)} />
                            <AccordionSection mode="expert" defaultOpen={false} title="Crédits Conso" icon={Landmark} colorClass="text-orange-600" items={formData.credits} onItemChange={(id, f, v) => updateItem('credits', id, f, v)} onItemAdd={() => addItem('credits')} onItemRemove={(id) => removeItem('credits', id)} />
                            <AccordionSection mode="expert" defaultOpen={false} title="Abonnements (Loisirs)" icon={Tv} colorClass="text-purple-600" type="simple" items={formData.subscriptions} onItemChange={(id, f, v) => updateItem('subscriptions', id, f, v)} onItemAdd={() => addItem('subscriptions')} onItemRemove={(id) => removeItem('subscriptions', id)} />
                        </div>

                        <div className="mt-12 flex justify-end">
                            <Button onClick={goNext} className="bg-slate-900 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all">
                                Continuer vers le Patrimoine <ArrowRight className="ml-2"/>
                            </Button>
                        </div>
                    </div>
                )}

                {/* --- ETAPE 3 : PATRIMOINE --- */}
                {currentStep === 3 && (
                    <div className={FADE_IN}>
                         <div className="mb-8">
                            <h1 className="text-3xl font-black text-slate-900 mb-2">Votre Patrimoine</h1>
                            <p className="text-slate-500">Une photo de ce que vous possédez aujourd'hui.</p>
                        </div>

                        {/* VALEUR MAISON JUMBO */}
                        {(formData.housing?.status === 'owner_loan' || formData.housing?.status === 'owner_paid') && (
                             <div className="bg-white rounded-3xl p-8 border border-blue-100 shadow-xl shadow-blue-50 mb-8">
                                <JumboInput 
                                    label="Estimation de votre Bien Immo"
                                    value={formData.housing?.marketValue}
                                    onChange={(e: any) => updateForm({ ...formData, housing: { ...formData.housing, marketValue: parseNumber(e.target.value) } })}
                                    subLabel="Prix de vente estimé (Actif Brut)"
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <Card className={`p-6 border-2 border-indigo-100 bg-white ${HOVER_SCALE}`}>
                                <div className="flex items-center gap-3 mb-4 text-indigo-700 font-bold"><CreditCard/> Compte Courant</div>
                                <input type="text" value={formData.currentBalance} onChange={(e) => updateForm({ ...formData, currentBalance: parseNumber(e.target.value) })} className="w-full text-3xl font-bold outline-none placeholder:text-slate-200" placeholder="0" />
                            </Card>
                            <Card className={`p-6 border-2 border-emerald-100 bg-white ${HOVER_SCALE}`}>
                                <div className="flex items-center gap-3 mb-4 text-emerald-700 font-bold"><Shield/> Épargne de Sécurité</div>
                                <input type="text" value={formData.savings} onChange={(e) => updateForm({ ...formData, savings: parseNumber(e.target.value) })} className="w-full text-3xl font-bold outline-none placeholder:text-slate-200" placeholder="0" />
                            </Card>
                        </div>

                        {isExpert && (
                             <div className="bg-purple-50/50 rounded-3xl p-8 border border-purple-100">
                                <div className="flex items-center gap-3 mb-6 text-purple-800 font-bold"><TrendingUp/> Investissements (Bourse, Crypto...)</div>
                                <div className="flex gap-6">
                                     <div className="flex-1 bg-white p-4 rounded-xl shadow-sm">
                                         <label className="text-xs font-bold text-slate-400 uppercase">Montant Total</label>
                                         <input type="text" value={formData.investments || ''} onChange={(e) => updateForm({ ...formData, investments: e.target.value })} className="w-full text-2xl font-bold outline-none mt-1" placeholder="0" />
                                     </div>
                                     <div className="w-32 bg-white p-4 rounded-xl shadow-sm">
                                         <label className="text-xs font-bold text-slate-400 uppercase">Rendement</label>
                                         <div className="flex items-baseline gap-1">
                                             <input type="text" value={formData.investmentYield || ''} onChange={(e) => updateForm({ ...formData, investmentYield: e.target.value })} className="w-full text-2xl font-bold outline-none mt-1 text-purple-600 text-center" placeholder="5" />
                                             <span className="font-bold text-purple-300">%</span>
                                         </div>
                                     </div>
                                </div>
                                <div className="mt-6 pt-6 border-t border-purple-100">
                                    <AccordionSection mode="expert" defaultOpen={true} title="Virements mensuels vers ces comptes" icon={PiggyBank} colorClass="text-purple-600" items={formData.savingsContributions} onItemChange={(id, f, v) => updateItem('savingsContributions', id, f, v)} onItemAdd={() => addItem('savingsContributions')} onItemRemove={(id) => removeItem('savingsContributions', id)} />
                                </div>
                             </div>
                        )}

                        <div className="mt-12 flex justify-end">
                            <Button onClick={goNext} className="bg-slate-900 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all">
                                Dernière étape <ArrowRight className="ml-2"/>
                            </Button>
                        </div>
                    </div>
                )}

                {/* --- ETAPE 4 : REALITY CHECK (CUSTOM SLIDER) --- */}
                {currentStep === 4 && (
                     <div className={FADE_IN}>
                         <RealityCheckUX 
                            income={calculateListTotal(formData.incomes)}
                            fixed={calculateListTotal(formData.fixedCosts) + calculateListTotal(formData.subscriptions)}
                            credits={calculateListTotal(formData.credits)}
                            housingCost={parseNumber(formData.housing?.monthlyCost)}
                            onConfirm={(lifestyle: number, savings: number) => {
                                handleSaveAndExit({ ...formData, foodBudget: Math.round(lifestyle * 0.6), funBudget: Math.round(lifestyle * 0.4) });
                            }}
                            isSaving={isSaving}
                         />
                     </div>
                )}
            </div>

            {/* SIDEBAR SYNTHESIS (Sticky Dynamic Island) */}
            {currentStep > 1 && (
                 <div className="lg:col-span-4 hidden lg:block animate-in fade-in slide-in-from-right duration-700">
                    <div className="sticky top-32">
                        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-2xl shadow-slate-200 overflow-hidden relative">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10 pointer-events-none"></div>
                             <div className="relative z-10">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Synthèse Live</h3>
                                
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-slate-300">Revenus</span>
                                    <span className="text-xl font-bold text-emerald-400">+{formatCurrency(stats.monthlyIncome)}</span>
                                </div>
                                <div className="flex justify-between items-end mb-6">
                                    <span className="text-slate-300">Fixes</span>
                                    <span className="text-xl font-bold text-white">- {formatCurrency(stats.mandatoryExpenses)}</span>
                                </div>
                                
                                <div className="h-px bg-slate-700 mb-6"></div>
                                
                                <div className="text-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Reste théorique</span>
                                    <div className="text-4xl font-black text-white mt-2 tracking-tight">
                                        {formatCurrency(stats.monthlyIncome - stats.mandatoryExpenses)}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-2">Pour Vivre & Épargner</div>
                                </div>
                             </div>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    </div>
  );
}

// --- SOUS-COMPOSANT : SLIDER UX ---
// Je le sors pour la lisibilité
const RealityCheckUX = ({ income, fixed, credits, housingCost, onConfirm, isSaving }: any) => {
    const totalMandatory = fixed + credits + housingCost;
    const theoreticalRest = Math.max(0, income - totalMandatory);
    const [savings, setSavings] = useState(0);
    const lifestyle = theoreticalRest - savings;
    const percent = Math.min(100, (savings / (theoreticalRest || 1)) * 100);

    return (
        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-2xl">
            <h1 className="text-3xl font-black text-slate-900 text-center mb-2">Le moment de vérité ⚖️</h1>
            <p className="text-center text-slate-500 mb-12">Glissez pour définir ce que vous gardez réellement.</p>

            {/* THE SLIDER CONTAINER */}
            <div className="relative h-16 bg-slate-100 rounded-full mb-12 p-2 select-none">
                 {/* FILL */}
                 <div className="absolute top-2 left-2 bottom-2 rounded-full bg-emerald-500 transition-all duration-75 ease-out" style={{ width: `calc(${percent}% - 8px)` }}></div>
                 
                 {/* KNOB */}
                 <div 
                    className="absolute top-1 bottom-1 w-14 bg-white rounded-full shadow-lg border border-slate-100 flex items-center justify-center cursor-ew-resize transition-all duration-75 ease-out active:scale-95"
                    style={{ left: `calc(${percent}% - ${percent > 95 ? '60px' : '0px'})` }}
                 >
                    <div className="w-1 h-4 bg-slate-300 rounded-full"></div>
                 </div>

                 {/* HIDDEN INPUT */}
                 <input 
                    type="range" min="0" max={theoreticalRest} step="10" 
                    value={savings} onChange={(e) => setSavings(parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                 />
            </div>

            <div className="grid grid-cols-2 gap-8 mb-12">
                 <div className="text-center group cursor-pointer transition-all">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-2 group-hover:text-emerald-500">J'épargne</div>
                    <div className="text-3xl md:text-5xl font-black text-emerald-600 transition-all group-hover:scale-110">{formatCurrency(savings)}</div>
                 </div>
                 <div className="text-center group cursor-pointer transition-all">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-2 group-hover:text-indigo-500">Je dépense</div>
                    <div className="text-3xl md:text-5xl font-black text-indigo-900 transition-all group-hover:scale-110">{formatCurrency(lifestyle)}</div>
                 </div>
            </div>

            <Button onClick={() => onConfirm(lifestyle, savings)} className="w-full bg-slate-900 text-white py-6 rounded-2xl text-xl font-bold hover:bg-black transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1">
                {isSaving ? <Loader2 className="animate-spin" /> : "Valider ma réalité"}
            </Button>
        </div>
    );
}