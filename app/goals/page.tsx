'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialData } from '@/app/hooks/useFinancialData';
// 👇 IMPORT DU MOTEUR
import {
  calculateFinancials,
  formatCurrency,
  generateId,
  GOAL_CATEGORIES,
  calculateMonthlyEffort, 
} from '@/app/lib/logic';
import { Goal } from '@/app/lib/types';

import {
  CheckCircle, AlertTriangle, XCircle, Wallet, TrendingUp,
  ArrowLeft, Save, Settings, Target, Plus, Trash2,
  CalendarDays, PiggyBank, LayoutGrid, ArrowRight, Banknote,
  Clock, TrendingDown, Scale
} from 'lucide-react';

import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import InputGroup from '@/app/components/ui/InputGroup';
import Badge from '@/app/components/ui/Badge';

// --- COMPOSANTS UI LOCAUX ---

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
                 {goal.transferDay && <span className="text-slate-400 ml-2">(Virement auto le {goal.transferDay})</span>}
             </div>
             <div className="text-slate-400">
                {goal.currentSaved > 0 && <span className="text-slate-500">Déjà {formatCurrency(goal.currentSaved)} de côté</span>}
             </div>
          </div>
      </Card>
  )
};

// ============================================================================
// PAGE GOALS
// ============================================================================

export default function GoalsPage() {
  const router = useRouter();
  const { profile, saveProfile, isLoaded } = useFinancialData();
  const stats = useMemo(() => calculateFinancials(profile), [profile]);
  const isProfileEmpty = stats.monthlyIncome === 0 && stats.matelas === 0;

  const hasGoals = stats.goalsBreakdown && stats.goalsBreakdown.length > 0;
  const [step, setStep] = useState<'input' | 'list'>(hasGoals ? 'list' : 'input');
  const [inputStep, setInputStep] = useState<'form' | 'check'>('form');
  const [isSaving, setIsSaving] = useState(false);

  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    name: '', category: 'REAL_ESTATE', targetAmount: '', currentSaved: '', deadline: '', projectedYield: '', transferDay: ''
  });

  const [hasSavings, setHasSavings] = useState(false);
  const [isInvested, setIsInvested] = useState(false);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [step, inputStep]);
  useEffect(() => {
    if (!hasSavings) setNewGoal(prev => ({ ...prev, currentSaved: '' }));
    if (!isInvested) setNewGoal(prev => ({ ...prev, projectedYield: '' }));
  }, [hasSavings, isInvested]);

  // --- LOGIQUE DE SIMULATION CONNECTÉE AU MOTEUR ---
  const simulation = useMemo(() => {
      if (inputStep !== 'check') return null;
      
      // 1. Préparation de l'objet Goal pour le moteur
      const tempGoal: Goal = {
          id: 'temp',
          name: newGoal.name || '',
          category: newGoal.category || 'OTHER',
          targetAmount: parseFloat(newGoal.targetAmount as string) || 0,
          currentSaved: parseFloat(newGoal.currentSaved as string) || 0,
          deadline: newGoal.deadline || '',
          projectedYield: parseFloat(newGoal.projectedYield as string) || 0,
          isInvested: isInvested
      };

      // 2. APPEL AU MOTEUR (Calcul précis avec intérêts composés)
      const monthlyEffort = calculateMonthlyEffort(tempGoal);

      // 3. Contexte financier global
      const capacity = stats.capacityToSave; 
      const currentCommitment = stats.totalGoalsEffort; 
      const remainingCapacity = capacity - currentCommitment; // Ce qui reste pour ce projet
      
      const isPossible = remainingCapacity >= monthlyEffort;
      const newRemaining = remainingCapacity - monthlyEffort;

      // Durée en mois (pour l'affichage)
      const start = new Date();
      const end = new Date(newGoal.deadline as string);
      let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      if (months <= 0) months = 1;

      // 4. GÉNÉRATION DES SOLUTIONS (SOLVEUR)
      const suggestions = [];

      if (!isPossible && remainingCapacity > 0) {
          
          const target = tempGoal.targetAmount;
          const saved = tempGoal.currentSaved;
          const rate = (tempGoal.projectedYield || 0) / 100 / 12;
          const missing = target - saved;

          // --- SOLUTION 1 : LE TEMPS ---
          // "Si je ne mets que ce qu'il me reste (remainingCapacity), combien de temps ça prend ?"
          let neededMonths;
          
          if (rate > 0) {
              // Formule NPER financière (Nombre de périodes)
              // n = ln((FV * r / PMT) + 1) / ln(1 + r)
              // Ici FV est le montant manquant qu'on veut atteindre
              try {
                  const num = Math.log(((missing * rate) / remainingCapacity) + 1);
                  const den = Math.log(1 + rate);
                  neededMonths = Math.ceil(num / den);
              } catch (e) {
                  neededMonths = 999; // Sécurité mathématique
              }
          } else {
              neededMonths = Math.ceil(missing / remainingCapacity);
          }

          const newDate = new Date();
          newDate.setMonth(newDate.getMonth() + neededMonths);
          
          suggestions.push({
              type: 'time',
              label: 'Jouer la patience',
              icon: Clock,
              text: `Avec ton budget actuel (${formatCurrency(remainingCapacity)}/mois), tu peux y arriver en repoussant la fin de ${Math.max(0, neededMonths - months)} mois.`,
              actionLabel: `Finir le ${newDate.toLocaleDateString()}`,
              payload: { deadline: newDate.toISOString().split('T')[0] }
          });

          // --- SOLUTION 2 : L'ARGENT ---
          // "Si je garde la date, combien je peux avoir au max avec mon budget ?"
          // Formule FV (Future Value)
          let maxPossibleTotal = 0;
          if (rate > 0) {
             // FV = PMT * (((1 + r)^n - 1) / r) + Saved * (1+r)^n
             const fv_pmt = remainingCapacity * ((Math.pow(1 + rate, months) - 1) / rate);
             const fv_saved = saved * Math.pow(1 + rate, months);
             maxPossibleTotal = fv_pmt + fv_saved;
          } else {
             maxPossibleTotal = saved + (remainingCapacity * months);
          }
          
          suggestions.push({
              type: 'amount',
              label: 'Réduire la cible',
              icon: TrendingDown,
              text: `Pour finir à cette date, ton budget te permet de viser ${formatCurrency(maxPossibleTotal)} (intérêts inclus).`,
              actionLabel: `Viser ${formatCurrency(maxPossibleTotal)}`,
              payload: { targetAmount: maxPossibleTotal.toFixed(0) }
          });
      } 
      else if (!isPossible && remainingCapacity <= 0) {
         // Cas critique
         suggestions.push({
             type: 'impossible',
             label: 'Budget saturé',
             icon: XCircle,
             text: "Tu n'as plus aucune marge de manœuvre. Il faut réduire tes autres objectifs.",
             isBlocking: true
         });
      }

      return { monthlyEffort, isPossible, newRemaining, months, remainingCapacity, suggestions };
  }, [inputStep, newGoal, stats, isInvested]); // Dépendances importantes


  const applySuggestion = (payload: any) => {
      setNewGoal({ ...newGoal, ...payload });
  };

  const handleSaveGoal = async () => {
    if (!newGoal.name || !newGoal.targetAmount || !newGoal.deadline) return;
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    const goalToAdd: Goal = {
      id: generateId(),
      name: newGoal.name || 'Projet',
      category: newGoal.category || 'OTHER',
      targetAmount: parseFloat(newGoal.targetAmount as string),
      currentSaved: parseFloat(newGoal.currentSaved as string) || 0,
      deadline: newGoal.deadline as string,
      projectedYield: parseFloat(newGoal.projectedYield as string) || 0,
      isInvested: isInvested,
      transferDay: newGoal.transferDay ? parseInt(newGoal.transferDay as string) : undefined
    };

    const updatedProfile = { ...profile, goals: [...(profile.goals || []), goalToAdd] };
    await saveProfile(updatedProfile);
    
    setIsSaving(false);
    setNewGoal({ name: '', category: 'REAL_ESTATE', targetAmount: '', currentSaved: '', deadline: '', projectedYield: '', transferDay: '' });
    setHasSavings(false); setIsInvested(false);
    setInputStep('form'); setStep('list');
  };

  const handleDeleteGoal = async (id: string) => {
    const updatedProfile = { ...profile, goals: (profile.goals || []).filter((g: Goal) => g.id !== id) };
    await saveProfile(updatedProfile);
    if (updatedProfile.goals.length === 0) setStep('input');
  };

  if (!isLoaded) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-pulse h-12 w-12 bg-slate-200 rounded-full"></div></div>;
  if (isProfileEmpty) return <div className="p-10 text-center">Profil manquant...</div>;

  const balanceAfterGoals = stats.capacityToSave - stats.totalGoalsEffort;
  const isOverBudget = balanceAfterGoals < 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
      
      {/* COLONNE GAUCHE */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-6">
        
        <div className="mb-2 flex justify-between items-end">
             <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Target className="text-emerald-600"/> {step === 'list' ? 'Mes Objectifs' : 'Nouveau Projet'}
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    {step === 'input' && inputStep === 'check' 
                        ? "Analyse des solutions..." 
                        : "Pilote tes projets et vérifie ta capacité."}
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
             {hasGoals && <button onClick={() => setStep('list')} className="text-slate-500 flex items-center gap-1 text-sm font-medium hover:text-emerald-600 transition-colors"><ArrowLeft size={16} /> Retour à la liste</button>}
            <Card className="p-6 md:p-8 border-emerald-100 shadow-md">
                <div className="space-y-6">
                    <InputGroup label="Nom du projet" placeholder="Ex: Apport Maison..." value={newGoal.name} onChange={(v: string) => setNewGoal({ ...newGoal, name: v })} />
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Type de projet</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {Object.values(GOAL_CATEGORIES).map((cat: any) => (
                            <button key={cat.id} onClick={() => setNewGoal({ ...newGoal, category: cat.id })} className={`p-3 rounded-lg text-sm font-medium border-2 transition-all text-left sm:text-center group ${newGoal.category === cat.id ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}>
                                <div className="font-bold mb-1 text-xl">{cat.icon}</div>
                                <div className="font-bold">{cat.label}</div>
                            </button>
                        ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputGroup label="Montant Cible" type="number" suffix="€" value={newGoal.targetAmount} onChange={(v: string) => setNewGoal({ ...newGoal, targetAmount: v })} />
                        <InputGroup label="Date butoir" type="date" value={newGoal.deadline} onChange={(v: string) => setNewGoal({ ...newGoal, deadline: v })} />
                    </div>
                    <div className="pt-2 space-y-3">
                        <label className="block text-sm font-medium text-slate-600">Paramètres avancés (optionnel)</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ContextToggle label="J'ai déjà de l'apport" subLabel="Déduire une somme" icon={PiggyBank} checked={hasSavings} onChange={setHasSavings} />
                            <ContextToggle label="Placement financier" subLabel="Ça rapporte des intérêts" icon={TrendingUp} checked={isInvested} onChange={setIsInvested} />
                        </div>
                        {(hasSavings || isInvested) && (
                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-4 animate-fade-in">
                                <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-2"><Settings size={16} /> Précisions</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {hasSavings && <InputGroup label="Montant déjà épargné" type="number" suffix="€" value={newGoal.currentSaved} onChange={(v: string) => setNewGoal({ ...newGoal, currentSaved: v })} />}
                                    {isInvested && <InputGroup label="Rendement annuel estimé" type="number" suffix="%" placeholder="3" value={newGoal.projectedYield} onChange={(v: string) => setNewGoal({ ...newGoal, projectedYield: v })} />}
                                </div>
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

        {/* --- MODE CHECK : VERDICT & SOLUTIONS --- */}
        {step === 'input' && inputStep === 'check' && simulation && (
             <div className="animate-fade-in space-y-6">
                <button onClick={() => setInputStep('form')} className="text-slate-500 flex items-center gap-1 text-sm font-medium hover:text-emerald-600 transition-colors">
                    <ArrowLeft size={16} /> Modifier les données
                </button>

                <Card className="overflow-hidden p-0 border-0 shadow-xl">
                    <div className={`${simulation.isPossible ? 'bg-emerald-600' : 'bg-amber-500'} p-6 text-white relative overflow-hidden`}>
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
                                {simulation.isPossible ? <CheckCircle size={32}/> : <Scale size={32}/>}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{simulation.isPossible ? "C'est réaliste !" : "Il faut ajuster..."}</h2>
                                <p className="text-white/90 text-sm mt-1">
                                    {simulation.isPossible 
                                        ? "Cet objectif rentre dans ton budget mensuel." 
                                        : `Tu dépasses ta capacité de ${formatCurrency(Math.abs(simulation.newRemaining))}. Voici des solutions.`}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-white space-y-6">
                        
                        {/* 1. CHIFFRES CLES */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 gap-4">
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Effort mensuel requis</div>
                                <div className="text-2xl font-black text-slate-800">{formatCurrency(simulation.monthlyEffort)} <span className="text-sm font-medium text-slate-400">/ mois</span></div>
                            </div>
                            <div className="hidden sm:block h-10 w-px bg-slate-200"></div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Nouveau Reste à Vivre</div>
                                <div className={`text-2xl font-black ${simulation.newRemaining < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {formatCurrency(simulation.newRemaining)}
                                </div>
                            </div>
                        </div>

                        {/* 2. LE CERVEAU : CHOIX DE SOLUTIONS */}
                        {!simulation.isPossible && simulation.suggestions.length > 0 && !simulation.suggestions[0].isBlocking && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                    <Settings size={14} /> Options pour passer au vert :
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {simulation.suggestions.map((option, i) => (
                                        <div key={i} className="flex flex-col p-4 border border-slate-200 rounded-xl bg-slate-50 hover:border-indigo-200 transition-colors">
                                            <div className="flex items-center gap-2 mb-2 font-bold text-slate-800">
                                                <div className="p-1.5 bg-white rounded-lg text-indigo-600 shadow-sm border border-slate-100">
                                                    <option.icon size={16} />
                                                </div>
                                                {option.label}
                                            </div>
                                            <p className="text-xs text-slate-500 mb-4 flex-1 leading-relaxed">
                                                {option.text}
                                            </p>
                                            <Button size="sm" variant="secondary" onClick={() => applySuggestion(option.payload)} className="w-full bg-white border-slate-200 shadow-sm hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200">
                                                {option.actionLabel}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Message Bloquant si aucune option */}
                        {!simulation.isPossible && simulation.suggestions[0]?.isBlocking && (
                             <div className="p-4 bg-rose-50 text-rose-800 rounded-xl text-sm border border-rose-100 flex gap-3">
                                 <XCircle size={20} className="shrink-0"/>
                                 {simulation.suggestions[0].text}
                             </div>
                        )}

                        {/* 3. NUDGE D'AUTOMATISATION */}
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                             <h3 className="text-indigo-900 font-bold flex items-center gap-2 mb-2">
                                <Banknote size={18} /> Automatise ta réussite
                             </h3>
                             <p className="text-sm text-indigo-800/80 mb-4 leading-relaxed">
                                 Programme un <strong>virement automatique</strong> pour ne pas avoir à y penser.
                             </p>
                             <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                 <label className="text-sm font-bold text-indigo-900 whitespace-nowrap">
                                     Jour du virement :
                                 </label>
                                 <select 
                                    className="p-2 bg-white border border-indigo-200 rounded-lg text-indigo-900 font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    value={newGoal.transferDay}
                                    onChange={(e) => setNewGoal({...newGoal, transferDay: e.target.value})}
                                 >
                                     <option value="">Choisir...</option>
                                     {[...Array(28)].map((_, i) => (
                                         <option key={i+1} value={i+1}>Le {i+1} du mois</option>
                                     ))}
                                 </select>
                             </div>
                        </div>

                        {/* 4. ACTIONS FINALES */}
                        <div className="pt-2">
                             <Button onClick={handleSaveGoal} disabled={isSaving} className={`w-full text-lg h-12 shadow-xl ${simulation.isPossible ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-800 hover:bg-slate-900'}`}>
                                 {isSaving ? "Configuration..." : simulation.isPossible ? "Valider et créer l'objectif" : "Forcer la création (Déconseillé)"}
                             </Button>
                             {!simulation.isPossible && (
                                 <p className="text-center text-xs text-slate-400 mt-3 font-medium">
                                     Tu peux forcer la création, mais ton reste à vivre sera négatif.
                                 </p>
                             )}
                        </div>
                    </div>
                </Card>
             </div>
        )}

        {/* LISTE (inchangée) */}
        {step === 'list' && (
          <div className="space-y-4 animate-fade-in">
             {(!stats.goalsBreakdown || stats.goalsBreakdown.length === 0) ? (
                 <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                    <LayoutGrid className="mx-auto text-slate-300 mb-3" size={48} />
                    <p className="text-slate-500 font-medium">Aucun objectif pour le moment.</p>
                    <Button variant="outline" className="mt-4" onClick={() => { setStep('input'); setInputStep('form'); }}>Créer mon premier objectif</Button>
                 </div>
             ) : (
                stats.goalsBreakdown.map((goal: any) => (
                    <GoalItemCard key={goal.id} goal={goal} onDelete={handleDeleteGoal} />
                ))
             )}
          </div>
        )}
      </div>

      {/* COLONNE DROITE (CONTEXTE) */}
      <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-6">
        <Card className="p-6 bg-white border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Wallet size={20} className="text-slate-400" /> Mon Budget
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 text-sm font-medium">Revenus Net</span>
                <span className="font-bold text-slate-700">{formatCurrency(stats.monthlyIncome)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                <div>
                     <span className="text-emerald-900 text-sm font-bold block">Capacité d'épargne</span>
                     <span className="text-[10px] text-emerald-600/70 uppercase font-bold tracking-wider">Le carburant</span>
                </div>
                <span className="font-bold text-emerald-700 text-xl">{formatCurrency(stats.capacityToSave)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-indigo-100 shadow-md bg-white relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${isOverBudget ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
            <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2"><TrendingUp size={20} /> Impact Mensuel</h3>
            
            <div className="space-y-4">
            <div>
                <div className="text-xs text-slate-400 font-bold uppercase mb-1">Effort requis pour tes projets</div>
                <div className="flex justify-between items-end">
                <div className="font-bold text-slate-800 text-2xl">{formatCurrency(stats.totalGoalsEffort)}</div>
                <Badge color={isOverBudget ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}>/ mois</Badge>
                </div>
            </div>
            <div className="h-px bg-slate-100"></div>
            <div>
                <div className="text-xs text-slate-400 font-bold uppercase mb-1">Reste pour imprévus / plaisirs</div>
                <div className={`font-bold text-xl ${isOverBudget ? 'text-rose-600' : 'text-slate-600'}`}>
                    {formatCurrency(balanceAfterGoals)}
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-snug">
                    {isOverBudget 
                        ? "Attention : Tes projets coûtent plus cher que ce que tu peux épargner." 
                        : "Excellent : Tu finances tes projets et tu gardes une marge de sécurité."}
                </p>
            </div>
            </div>
        </Card>
      </div>
    </div>
  );
}