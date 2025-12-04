'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialData } from '@/app/hooks/useFinancialData';

// 👇 IMPORTS DU MOTEUR & TYPES
import {
  calculateMonthlyEffort,
  analyzeGoalStrategies,
  simulateGoalProjection,
  calculateFinancials,
  formatCurrency,
  generateId,
  GOAL_CATEGORIES,
} from '@/app/lib/logic';
import { Goal } from '@/app/lib/types';

// 👇 IMPORTS ICONES
import {
  CheckCircle, AlertTriangle, XCircle, Wallet, TrendingUp,
  ArrowLeft, Settings, Target, Plus, Trash2,
  CalendarDays, PiggyBank, LayoutGrid, ArrowRight, Banknote,
  Clock, Scissors, Shuffle, Landmark
} from 'lucide-react';

// 👇 IMPORT GRAPHIQUE
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';

import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import InputGroup from '@/app/components/ui/InputGroup';
import Badge from '@/app/components/ui/Badge';

// ============================================================================
// 🧠 COUCHE CONTROLEUR / LOGIQUE (Devrait être dans app/lib/logic.ts)
// ============================================================================

/**
 * Prépare le contexte financier pour la page (Nettoyage des données brutes)
 */
const prepareFinancialContext = (profile: any) => {
    const stats = calculateFinancials(profile);
    const isProfileEmpty = stats.monthlyIncome === 0 && stats.matelas === 0;
    const currentGoalsCommitment = stats.totalGoalsEffort;
    const hasGoals = stats.goalsBreakdown && stats.goalsBreakdown.length > 0;
    
    // Calcul de la capacité disponible AVANT le nouveau projet
    const remainingCapacity = stats.capacityToSave - currentGoalsCommitment;

    return { stats, isProfileEmpty, currentGoalsCommitment, hasGoals, remainingCapacity };
};

/**
 * Orchestre la simulation complète d'un objectif (Le "Cerveau")
 * Encapsule le Patch Temporel et les règles métier.
 */
const runSimulationController = (
    goalInput: Partial<Goal>, 
    isInvested: boolean, 
    context: ReturnType<typeof prepareFinancialContext>
) => {
    // 1. Normalisation de l'objet Goal
    const tempGoal: Goal = {
        id: 'temp',
        name: goalInput.name || '',
        category: goalInput.category || 'OTHER',
        targetAmount: parseFloat(goalInput.targetAmount as string) || 0,
        currentSaved: parseFloat(goalInput.currentSaved as string) || 0,
        deadline: goalInput.deadline || '',
        projectedYield: parseFloat(goalInput.projectedYield as string) || 0,
        isInvested: isInvested
    };

    // 2. Calculs Moteur
    const monthlyEffort = calculateMonthlyEffort(tempGoal);
    const projectionData = simulateGoalProjection(tempGoal, monthlyEffort);

    // 3. Patch Métier : Gestion des durées ultra-courtes (< 1 mois)
    // Si le moteur mathématique renvoie 0 (car pas assez de temps pour itérer), on force la cohérence.
    if (projectionData.summary.finalAmount === 0 && monthlyEffort > 0) {
        const manualTotal = Math.round(monthlyEffort + (tempGoal.currentSaved || 0));
        projectionData.summary.finalAmount = manualTotal;
        projectionData.summary.totalPocket = manualTotal;
        
        if (projectionData.projection.length <= 1) {
            projectionData.projection.push({
                month: 1,
                date: new Date(tempGoal.deadline),
                balance: manualTotal,
                contributed: manualTotal,
                interests: 0
            });
        }
    }

    // 4. Estimation de la marge de manoeuvre (Budget Plaisir)
    const estimatedDiscretionary = (context.stats.monthlyIncome - context.stats.fixedCosts) * 0.3; 

    // 5. Diagnostic final
    const diagnosis = analyzeGoalStrategies(
        tempGoal,
        monthlyEffort,
        context.remainingCapacity,
        estimatedDiscretionary,
        context.stats.monthlyIncome,
        context.stats.matelas
    );

    return { tempGoal, monthlyEffort, projectionData, diagnosis };
};

/**
 * Calcul les données d'affichage pour la Sidebar (Impact Mensuel)
 */
const calculateSidebarMetrics = (
    isSimulating: boolean, 
    simulation: any, 
    context: ReturnType<typeof prepareFinancialContext>
) => {
    const displayedGoalsEffort = (isSimulating && simulation) 
        ? context.currentGoalsCommitment + simulation.monthlyEffort 
        : context.currentGoalsCommitment;

    const displayedRemaining = context.stats.capacityToSave - displayedGoalsEffort;
    const isBudgetNegative = displayedRemaining < 0;

    return { displayedGoalsEffort, displayedRemaining, isBudgetNegative };
};

/**
 * Applique une stratégie et retourne le nouvel état du formulaire
 */
const applyStrategyToForm = (strategy: any, currentForm: Partial<Goal>) => {
    let updates: Partial<Goal> = {};
    let triggerSavings = false;

    if (strategy.type === 'TIME' || strategy.type === 'HYBRID') {
        const dateStr = new Date(strategy.value).toISOString().split('T')[0];
        updates = { deadline: dateStr };
    } 
    else if (strategy.type === 'BUDGET' && strategy.actionLabel === "Simuler un virement") {
        const addedAmount = strategy.value;
        const current = parseFloat(currentForm.currentSaved as string) || 0;
        updates = { currentSaved: (current + addedAmount).toString() };
        triggerSavings = true;
    }

    return { updates, triggerSavings };
};


// ============================================================================
// COMPOSANTS UI (PRESENTATION PURE)
// ============================================================================

const ProjectionChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return null;
  return (
    <div className="h-[200px] w-full mt-4 animate-fade-in">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(date) => date ? new Date(date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) : ''}
            tick={{fontSize: 10, fill: '#94a3b8'}}
            axisLine={false}
            tickLine={false}
            minTickGap={30}
          />
          <YAxis hide />
          <Tooltip 
            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
            formatter={(value: number) => [formatCurrency(value), 'Capital']}
            labelFormatter={(label) => label ? new Date(label).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : ''}
          />
          <Area 
            type="monotone" 
            dataKey="balance" 
            stroke="#10b981" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorBalance)" 
            animationDuration={1500}
          />
          <Area 
            type="monotone" 
            dataKey="contributed" 
            stroke="#64748b" 
            strokeDasharray="4 4"
            fill="none" 
            strokeWidth={1}
            name="Versements seuls"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const StrategyIcon = ({ type }: { type: string }) => {
    switch(type) {
        case 'TIME': return <Clock size={18} />;
        case 'BUDGET': return <Scissors size={18} />;
        case 'HYBRID': return <Shuffle size={18} />;
        case 'INCOME': return <TrendingUp size={18} />;
        default: return <Settings size={18} />;
    }
};

const ContextToggle = ({ label, subLabel, icon: Icon, checked, onChange }: any) => (
  <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all duration-200 ${checked ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
    <div className={`p-2 rounded-lg ${checked ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
      <Icon size={20} />
    </div>
    <div className="flex-1">
      <div className={`font-bold text-sm ${checked ? 'text-emerald-900' : 'text-slate-700'}`}>{label}</div>
      <div className="text-xs text-slate-500 mt-0.5">{subLabel}</div>
    </div>
    <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${checked ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-300'}`}>
      {checked && <CheckCircle size={14} className="text-white" />}
    </div>
    <input type="checkbox" className="hidden" checked={checked} onChange={(e) => onChange(e.target.checked)} />
  </label>
);

const GoalItemCard = ({ goal, onDelete }: { goal: any, onDelete: (id: string) => void }) => {
  // @ts-ignore
  const catInfo = GOAL_CATEGORIES[goal.category] || { label: 'Autre', icon: '🎯' };
  
  return (
      <Card className="p-5 border-slate-200 bg-white group hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl text-2xl flex items-center justify-center border border-emerald-100">
                    {catInfo.icon}
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">{goal.name}</h3>
                    <div className="text-sm text-slate-500 flex items-center gap-2">
                        <span>Cible : {formatCurrency(goal.targetAmount)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><CalendarDays size={12}/> {new Date(goal.deadline).toLocaleDateString()}</span>
                    </div>
                </div>
              </div>
              <Button variant="ghost" className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2" onClick={() => onDelete(goal.id)}>
                  <Trash2 size={18} />
              </Button>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-xs">
             <div className="text-slate-400 font-medium">
                 Effort : <span className="text-emerald-600 font-bold">{formatCurrency(goal.monthlyContribution)} / mois</span>
                 {goal.transferDay && <span className="text-slate-400 ml-2">(Virement le {goal.transferDay})</span>}
             </div>
             <div className="text-slate-400">
                {goal.currentSaved > 0 && <span className="text-slate-500">Déjà {formatCurrency(goal.currentSaved)} de côté</span>}
             </div>
          </div>
      </Card>
  )
};

// ============================================================================
// PAGE VIEW - MAIN
// ============================================================================

export default function GoalsPage() {
  const router = useRouter();
  const { profile, saveProfile, isLoaded } = useFinancialData();
  
  // 1. Initialisation du contexte financier via le Controleur
  const context = useMemo(() => prepareFinancialContext(profile), [profile]);

  const [step, setStep] = useState<'input' | 'list'>(context.hasGoals ? 'list' : 'input');
  const [inputStep, setInputStep] = useState<'form' | 'check'>('form');
  const [isSaving, setIsSaving] = useState(false);

  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    name: '', category: 'REAL_ESTATE', targetAmount: '', currentSaved: '', deadline: '', projectedYield: '', transferDay: ''
  });

  const [hasSavings, setHasSavings] = useState(false);
  const [isInvested, setIsInvested] = useState(false);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [step, inputStep]);
  
  // Gestion purement UI des toggles (nettoyage des champs si désactivés)
  useEffect(() => {
    if (!hasSavings) setNewGoal(prev => ({ ...prev, currentSaved: '' }));
    if (!isInvested) setNewGoal(prev => ({ ...prev, projectedYield: '' }));
  }, [hasSavings, isInvested]);

  // 2. Appel du Moteur de Simulation via le Controleur
  const simulation = useMemo(() => {
      if (inputStep !== 'check') return null;
      return runSimulationController(newGoal, isInvested, context);
  }, [inputStep, newGoal, isInvested, context]);

  // 3. Calcul des métriques d'affichage Sidebar via le Controleur
  const sidebarMetrics = calculateSidebarMetrics(
      inputStep === 'check', 
      simulation, 
      context
  );

  // --- Handlers UI ---

  const handleApplyStrategy = (strategy: any) => {
    const { updates, triggerSavings } = applyStrategyToForm(strategy, newGoal);
    setNewGoal({ ...newGoal, ...updates });
    if (triggerSavings) setHasSavings(true);
  };

  const handleSaveGoal = async () => {
    if (!simulation) return;
    setIsSaving(true);
    // Simulation délai réseau
    await new Promise(resolve => setTimeout(resolve, 800));

    const goalToAdd: Goal = {
      ...simulation.tempGoal,
      id: generateId(),
      monthlyContribution: simulation.monthlyEffort,
      transferDay: newGoal.transferDay ? parseInt(newGoal.transferDay as string) : undefined
    };

    const updatedProfile = { ...profile, goals: [...(profile.goals || []), goalToAdd] };
    await saveProfile(updatedProfile);
    
    setIsSaving(false);
    // Reset Form
    setNewGoal({ name: '', category: 'REAL_ESTATE', targetAmount: '', currentSaved: '', deadline: '', projectedYield: '', transferDay: '' });
    setHasSavings(false); setIsInvested(false);
    setInputStep('form'); setStep('list');
  };

  const handleDeleteGoal = async (id: string) => {
    const updatedGoals = (profile.goals || []).filter((g: Goal) => g.id !== id);
    const updatedProfile = { ...profile, goals: updatedGoals };
    await saveProfile(updatedProfile);
    if (updatedGoals.length === 0) setStep('input');
  };

  if (!isLoaded) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-pulse h-12 w-12 bg-slate-200 rounded-full"></div></div>;
  if (context.isProfileEmpty) return <div className="p-10 text-center">Profil manquant...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in pb-20">
      
      {/* COLONNE GAUCHE */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-6">
        
        <div className="mb-2 flex justify-between items-end">
             <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Target className="text-emerald-600"/> {step === 'list' ? 'Mes Objectifs' : 'Nouveau Projet'}
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    {step === 'input' && inputStep === 'check' 
                        ? "Analyse de faisabilité..." 
                        : "Planifie ton avenir financier."}
                </p>
             </div>
             {step === 'list' && (
                 <Button size="sm" onClick={() => { setStep('input'); setInputStep('form'); }} className="shadow-lg bg-emerald-600 hover:bg-emerald-700">
                     <Plus size={16} /> Nouveau
                 </Button>
             )}
        </div>

        {/* INPUT FORM */}
        {step === 'input' && inputStep === 'form' && (
          <div className="animate-fade-in space-y-4">
             {context.hasGoals && <button onClick={() => setStep('list')} className="text-slate-500 flex items-center gap-1 text-sm font-medium hover:text-emerald-600 transition-colors"><ArrowLeft size={16} /> Retour à la liste</button>}
            <Card className="p-6 md:p-8 border-emerald-100 shadow-md">
                <div className="space-y-6">
                    <InputGroup label="Nom du projet" placeholder="Ex: Apport Maison..." value={newGoal.name} onChange={(v: string) => setNewGoal({ ...newGoal, name: v })} />
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Type de projet</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {Object.values(GOAL_CATEGORIES).map((cat: any) => (
                            <button key={cat.id} onClick={() => setNewGoal({ ...newGoal, category: cat.id })} className={`p-2 rounded-lg text-xs font-medium border transition-all text-center hover:scale-105 ${newGoal.category === cat.id ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}>
                                <div className="text-lg mb-1">{cat.icon}</div>
                                {cat.label}
                            </button>
                        ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputGroup label="Montant Cible" type="number" suffix="€" value={newGoal.targetAmount} onChange={(v: string) => setNewGoal({ ...newGoal, targetAmount: v })} />
                        <InputGroup label="Date butoir" type="date" value={newGoal.deadline} onChange={(v: string) => setNewGoal({ ...newGoal, deadline: v })} />
                    </div>

                    <div className="pt-2 space-y-3">
                        <label className="block text-sm font-medium text-slate-600">Paramètres avancés</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ContextToggle label="Apport initial" subLabel="J'ai déjà une somme" icon={PiggyBank} checked={hasSavings} onChange={setHasSavings} />
                            <ContextToggle label="Investissement" subLabel="Placé avec rendement" icon={TrendingUp} checked={isInvested} onChange={setIsInvested} />
                        </div>
                        {(hasSavings || isInvested) && (
                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-4">
                                {hasSavings && <InputGroup label="Montant déjà épargné" type="number" suffix="€" value={newGoal.currentSaved} onChange={(v: string) => setNewGoal({ ...newGoal, currentSaved: v })} />}
                                {isInvested && <InputGroup label="Rendement annuel estimé" type="number" suffix="%" placeholder="4" value={newGoal.projectedYield} onChange={(v: string) => setNewGoal({ ...newGoal, projectedYield: v })} />}
                            </div>
                        )}
                    </div>

                    <div className="pt-4">
                        <Button onClick={() => setInputStep('check')} className="w-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2" disabled={!newGoal.targetAmount || !newGoal.name || !newGoal.deadline}>
                             Simuler ce projet <ArrowRight size={16} />
                        </Button>
                    </div>
                </div>
            </Card>
          </div>
        )}

        {/* --- MODE CHECK : VERDICT DU MOTEUR --- */}
        {step === 'input' && inputStep === 'check' && simulation && (
             <div className="animate-fade-in space-y-6">
                <button onClick={() => setInputStep('form')} className="text-slate-500 flex items-center gap-1 text-sm font-medium hover:text-emerald-600 transition-colors">
                    <ArrowLeft size={16} /> Modifier les données
                </button>

                <Card className="overflow-hidden p-0 border-0 shadow-xl">
                    {/* EN-TÊTE DYNAMIQUE */}
                    <div className={`p-6 text-white relative overflow-hidden transition-colors duration-500 ${
                        simulation.diagnosis.status === 'POSSIBLE' || simulation.diagnosis.status === 'DONE' ? 'bg-emerald-600' : 
                        simulation.diagnosis.status === 'HARD' ? 'bg-amber-500' : 'bg-slate-800'
                    }`}>
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
                                {simulation.diagnosis.status === 'POSSIBLE' ? <CheckCircle size={32}/> : 
                                 simulation.diagnosis.status === 'HARD' ? <AlertTriangle size={32}/> : <XCircle size={32}/>}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{simulation.diagnosis.label}</h2>
                                <p className="text-white/90 text-sm mt-1">
                                    {simulation.diagnosis.mainMessage}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-white space-y-8">
                        
                        {/* 1. CHIFFRES CLES */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 gap-4">
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Effort mensuel requis</div>
                                <div className="text-2xl font-black text-slate-800">{formatCurrency(simulation.monthlyEffort)} <span className="text-sm font-medium text-slate-400">/ mois</span></div>
                            </div>
                            <div className="hidden sm:block h-10 w-px bg-slate-200"></div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Capital Final Estimé</div>
                                <div className="text-2xl font-black text-emerald-600">
                                    {formatCurrency(simulation.projectionData.summary.finalAmount)}
                                </div>
                                {simulation.projectionData.summary.totalInterests > 0 && (
                                    <div className="text-xs text-emerald-600 font-medium">
                                        Dont {formatCurrency(simulation.projectionData.summary.totalInterests)} d'intérêts
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. GRAPHIQUE DE PROJECTION */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Trajectoire prévue</h3>
                            <ProjectionChart data={simulation.projectionData.projection} />
                        </div>

                        {/* 3. STRATÉGIES SUGGÉRÉES */}
                        {simulation.diagnosis.strategies.length > 0 && (
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                    <Settings size={14} /> Stratégies pour optimiser :
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {simulation.diagnosis.strategies.map((strat: any, i: number) => (
                                        <div key={i} className={`flex flex-col p-4 border rounded-xl transition-colors relative overflow-hidden ${strat.painLevel === 'HIGH' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-200 hover:border-indigo-200'}`}>
                                            <div className="flex items-center gap-2 mb-2 font-bold text-slate-800">
                                                <div className="p-1.5 bg-white rounded-lg text-indigo-600 shadow-sm border border-slate-100">
                                                    <StrategyIcon type={strat.type} />
                                                </div>
                                                {strat.title}
                                            </div>
                                            <p className="text-xs text-slate-600 mb-4 flex-1 leading-relaxed">
                                                {strat.message}
                                            </p>
                                            {strat.actionLabel && !strat.disabled && (
                                                <Button size="sm" variant="secondary" onClick={() => handleApplyStrategy(strat)} className="w-full bg-white border-slate-200 shadow-sm hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200">
                                                    {strat.actionLabel || "Appliquer"}
                                                </Button>
                                            )}
                                            {strat.type === 'TIME' && (
                                                <Button size="sm" variant="secondary" onClick={() => handleApplyStrategy(strat)} className="w-full bg-white border-slate-200 shadow-sm hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200">
                                                    Ajuster la date
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. AUTOMATISATION */}
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                             <h3 className="text-indigo-900 font-bold flex items-center gap-2 mb-2">
                                <Banknote size={18} /> Automatisation
                             </h3>
                             <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                 <label className="text-sm font-bold text-indigo-900 whitespace-nowrap">
                                     Jour du virement :
                                 </label>
                                 <select 
                                    className="p-2 bg-white border border-indigo-200 rounded-lg text-indigo-900 font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    value={newGoal.transferDay || ""}
                                    onChange={(e) => setNewGoal({...newGoal, transferDay: e.target.value})}
                                 >
                                     <option value="">Choisir...</option>
                                     {[...Array(28)].map((_, i) => (
                                         <option key={i+1} value={i+1}>Le {i+1} du mois</option>
                                     ))}
                                 </select>
                             </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="pt-2">
                             <Button onClick={handleSaveGoal} disabled={isSaving} className={`w-full text-lg h-12 shadow-xl ${simulation.diagnosis.status !== 'IMPOSSIBLE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-800 hover:bg-slate-900'}`}>
                                 {isSaving ? "Création..." : simulation.diagnosis.status !== 'IMPOSSIBLE' ? "Valider et créer l'objectif" : "Forcer la création"}
                             </Button>
                             {simulation.diagnosis.status === 'IMPOSSIBLE' && (
                                <p className="text-center text-xs text-slate-400 mt-2">Attention : Votre budget sera en négatif.</p>
                             )}
                        </div>
                    </div>
                </Card>
             </div>
        )}

        {/* LISTE DES OBJECTIFS */}
        {step === 'list' && (
          <div className="space-y-4 animate-fade-in">
             {(!context.hasGoals) ? (
                 <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                    <LayoutGrid className="mx-auto text-slate-300 mb-3" size={48} />
                    <p className="text-slate-500 font-medium">Aucun objectif pour le moment.</p>
                    <Button variant="outline" className="mt-4" onClick={() => { setStep('input'); setInputStep('form'); }}>Créer mon premier objectif</Button>
                 </div>
             ) : (
                context.stats.goalsBreakdown.map((goal: any) => (
                    <GoalItemCard key={goal.id} goal={goal} onDelete={handleDeleteGoal} />
                ))
             )}
          </div>
        )}
      </div>

      {/* COLONNE DROITE (CONTEXTE BUDGET) */}
      <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-6">
        <Card className="p-6 bg-white border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Wallet size={20} className="text-slate-400" /> Mon Budget
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 text-sm font-medium">Revenus Net</span>
                <span className="font-bold text-slate-700">{formatCurrency(context.stats.monthlyIncome)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                <div>
                     <span className="text-emerald-900 text-sm font-bold block">Capacité d'épargne</span>
                     <span className="text-[10px] text-emerald-600/70 uppercase font-bold tracking-wider">Le carburant</span>
                </div>
                <span className="font-bold text-emerald-700 text-xl">{formatCurrency(context.stats.capacityToSave)}</span>
            </div>
             {context.stats.matelas > 0 && (
                <div className="flex justify-between items-center p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                    <div>
                        <span className="text-indigo-900 text-sm font-bold block">Épargne dispo</span>
                        <span className="text-[10px] text-indigo-600/70 uppercase font-bold tracking-wider">Le stock</span>
                    </div>
                    <span className="font-bold text-indigo-700">{formatCurrency(context.stats.matelas)}</span>
                </div>
             )}
          </div>
        </Card>

        <Card className="p-6 border-indigo-100 shadow-md bg-white relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${sidebarMetrics.isBudgetNegative ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
            <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2"><Landmark size={20} /> Impact Mensuel</h3>
            
            <div className="space-y-4">
            <div>
                <div className="text-xs text-slate-400 font-bold uppercase mb-1">Effort actuel pour projets</div>
                <div className="flex justify-between items-end">
                {/* Plus de logique ici, juste l'affichage de la valeur calculée en amont */}
                <div className="font-bold text-slate-800 text-2xl">{formatCurrency(sidebarMetrics.displayedGoalsEffort)}</div>
                <Badge color={sidebarMetrics.isBudgetNegative ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}>/ mois</Badge>
                </div>
            </div>
            <div className="h-px bg-slate-100"></div>
            <div>
                <div className="text-xs text-slate-400 font-bold uppercase mb-1">Marge restante</div>
                <div className={`font-bold text-xl ${sidebarMetrics.isBudgetNegative ? 'text-rose-600' : 'text-slate-600'}`}>
                    {formatCurrency(sidebarMetrics.displayedRemaining)}
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-snug">
                    {sidebarMetrics.isBudgetNegative 
                        ? "Attention : Tes projets coûtent plus cher que ce que tu peux épargner." 
                        : "Excellent : Tu finances tes projets et tu gardes une marge."}
                </p>
            </div>
            </div>
        </Card>
      </div>
    </div>
  );
}