'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, SignIn } from '@clerk/nextjs'; 
import { clerkAppearanceHybrid } from '@/app/config/clerk-theme'; // 👈 On utilise le thème Hybride

// --- IMPORTS RÉELS ---
import { useFinancialData } from '@/app/hooks/useFinancialData';
import { calculateFinancials, formatCurrency } from '@/app/lib/logic';

// --- IMPORTS UI ---
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Badge from '@/app/components/ui/Badge';

import {
  TrendingUp,
  TrendingDown,
  Shield,
  Activity,
  Settings,
  ArrowRight,
  Zap,
  PiggyBank,
  Layers,
  Wallet,
  CreditCard,
  ShoppingCart,
  CheckCircle2 // Pour la liste des avantages sur PC
} from 'lucide-react';

// ============================================================================
// 1. COMPOSANTS UI DU DASHBOARD (Ton code existant)
// ============================================================================

const ProgressBar = ({ value, max, colorClass }: { value: number, max: number, colorClass: string }) => {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
      <div className={`h-full ${colorClass} transition-all duration-500`} style={{ width: `${percent}%` }}></div>
    </div>
  );
};

const LEVELS = [
  { min: 0, max: 40, label: "Survie", color: "text-rose-500", bg: "bg-rose-500", border: "border-rose-100" },
  { min: 40, max: 70, label: "Construction", color: "text-amber-500", bg: "bg-amber-500", border: "border-amber-100" },
  { min: 70, max: 90, label: "Confort", color: "text-emerald-500", bg: "bg-emerald-500", border: "border-emerald-100" },
  { min: 90, max: 101, label: "Liberté", color: "text-indigo-500", bg: "bg-indigo-500", border: "border-indigo-100" },
];

const getLevel = (score: number) => LEVELS.find(l => score >= l.min && score < l.max) || LEVELS[0];

const LevelGauge = ({ score, level }: any) => {
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  
  const getColor = (cls: string) => {
    if (cls.includes('emerald')) return '#10b981';
    if (cls.includes('amber')) return '#f59e0b';
    if (cls.includes('indigo')) return '#6366f1';
    return '#f43f5e';
  };

  return (
    <div className="relative flex items-center justify-center mx-auto" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full drop-shadow-sm">
        <circle cx={size/2} cy={size/2} r={radius} stroke="#f1f5f9" strokeWidth={strokeWidth} fill="transparent" />
        <circle cx={size/2} cy={size/2} r={radius} stroke={getColor(level.color)} strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Score</div>
        <div className={`text-4xl font-black tracking-tighter ${level.color}`}>{score}</div>
      </div>
    </div>
  );
};

const BudgetRow = ({ label, icon: Icon, amount, total, color, subtext = null }: any) => {
    const percent = total > 0 ? Math.round((amount / total) * 100) : 0;
    return (
        <div className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-default group">
            <div className={`p-2.5 rounded-xl ${color.bg} ${color.text} group-hover:scale-110 transition-transform`}>
                <Icon size={20} />
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-700 text-sm">{label}</span>
                    <span className="font-bold text-slate-800">{formatCurrency(amount)}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex items-center">
                    <div className={`h-full ${color.bar}`} style={{ width: `${percent}%` }}></div>
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-slate-400 font-medium">{percent}% du revenu</span>
                    {subtext && <span className="text-[10px] text-slate-500 font-medium">{subtext}</span>}
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// 2. LE COMPOSANT DASHBOARD (Ton code existant encapsulé)
// ============================================================================

function DashboardView() {
  const router = useRouter();
  const { profile, saveProfile, isLoaded } = useFinancialData();
  const stats = useMemo(() => calculateFinancials(profile), [profile]);

  if (!isLoaded) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-pulse h-12 w-12 bg-slate-200 rounded-full"></div></div>;

  if (stats.monthlyIncome === 0 && stats.matelas === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[70vh] text-center animate-fade-in bg-slate-50">
        <div className="p-6 bg-indigo-50 rounded-full text-indigo-600 mb-6 shadow-sm animate-bounce-slow"><Settings size={64} /></div>
        <h2 className="text-3xl font-bold text-slate-800 mb-3">Bienvenue !</h2>
        <p className="text-slate-500 mb-8 max-w-md">Configure ton profil pour débloquer ton tableau de bord financier.</p>
        <Button onClick={() => router.push('/profile')} className="shadow-xl">
          Configurer mon profil <ArrowRight size={20} />
        </Button>
      </div>
    );
  }

  const isExpert = profile.mode === 'expert';
  const toggleMode = (newMode: 'beginner' | 'expert') => {
    saveProfile({ ...profile, mode: newMode });
  };

  const safetyRatio = Math.min(1, stats.safetyMonths / (stats.rules.safetyMonths || 3));
  const debtRatio = stats.engagementRate / (stats.rules.maxDebt || 33);
  
  let finalScore = 0;
  let debtScore = 0;

  if (isExpert) {
    debtScore = Math.max(0, 40 * (1 - (debtRatio * 0.5)));
    const investRatio = (stats.investments / (stats.monthlyIncome * 12 * 0.2)) || 0;
    const investScore = Math.min(1, investRatio) * 20; 
    finalScore = Math.round((safetyRatio * 40) + debtScore + investScore);
  } else {
    debtScore = Math.max(0, 50 * (1 - (debtRatio * 0.5)));
    finalScore = Math.round((safetyRatio * 50) + debtScore);
  }

  const currentLevel = getLevel(finalScore);
  const userName = profile.firstName || "Utilisateur";

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-600">
      
      {/* HEADER DASHBOARD */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Tableau de Bord</h1>
          <p className="text-slate-500 text-sm">Bon retour, {userName}</p>
        </div>
        
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex">
            <button onClick={() => toggleMode('beginner')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${!isExpert ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Standard</button>
            <button onClick={() => toggleMode('expert')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isExpert ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Expert</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start animate-fade-in pb-12">
        
        {/* COLONNE GAUCHE */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
            <Card className={`p-6 flex flex-col items-center justify-center text-center relative ${currentLevel.border} border-t-4`}>
                <div className="flex justify-between w-full items-center mb-4 px-2">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Activity size={18} className="text-slate-400"/> Santé</h3>
                    <Badge color={`${currentLevel.bg.replace('bg-', 'bg-opacity-20 text-')} border-none`}>{currentLevel.label}</Badge>
                </div>
                <div className="mb-6 relative z-10"><LevelGauge score={finalScore} level={currentLevel} /></div>
                <div className={`grid ${isExpert ? 'grid-cols-3' : 'grid-cols-2'} gap-2 w-full text-center`}>
                    <div className="bg-slate-50 rounded-lg p-2">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Sécurité</div>
                        <div className="font-bold text-slate-700">{Math.round(safetyRatio * (isExpert ? 40 : 50))}/{isExpert ? 40 : 50}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Dette</div>
                        <div className="font-bold text-slate-700">{Math.round(debtScore)}/{isExpert ? 40 : 50}</div>
                    </div>
                    {isExpert && (
                        <div className="bg-slate-50 rounded-lg p-2">
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Invest</div>
                            <div className="font-bold text-slate-700">{Math.round(finalScore - (safetyRatio * 40) - debtScore)}/20</div>
                        </div>
                    )}
                </div>
            </Card>

            <div className="grid grid-cols-1 gap-3">
                <Button onClick={() => router.push('/simulator')} className="w-full shadow-lg"><Zap size={20} /> Simuler un achat</Button>
                <Button variant="outline" onClick={() => router.push('/profile')}><Settings size={18} /> Ajuster mon Profil</Button>
            </div>

            <Card className="p-6 bg-slate-900 text-white border-none relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-indigo-500 rounded-full opacity-10 blur-3xl transform translate-x-10 -translate-y-10"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4 text-slate-400">
                        <Layers size={20} /> <span className="text-sm font-bold uppercase tracking-wider">Patrimoine Total</span>
                    </div>
                    <div className="text-4xl font-black tracking-tight mb-1">{formatCurrency(stats.totalWealth)}</div>
                    {isExpert && (
                        <div className="text-xs text-slate-400 flex justify-between items-center mt-4 pt-4 border-t border-slate-700">
                            <span>Dont Investi (Bloqué)</span>
                            <span className="text-white font-bold">{formatCurrency(stats.investments)}</span>
                        </div>
                    )}
                </div>
            </Card>
        </div>

        {/* COLONNE DROITE */}
        <div className="lg:col-span-8 space-y-6">
            <Card className="p-6 md:p-8">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Wallet className="text-indigo-600" /> Ton Budget Mensuel</h2>
                <div className="space-y-1">
                    <BudgetRow label="Revenus Nets" icon={Wallet} amount={stats.monthlyIncome} total={stats.monthlyIncome} color={{ bg: 'bg-emerald-100', text: 'text-emerald-600', bar: 'bg-emerald-500' }} />
                    <div className="h-px bg-slate-100 my-4 mx-4"></div>
                    <BudgetRow label="Charges Fixes" icon={CreditCard} amount={stats.mandatoryExpenses} total={stats.monthlyIncome} color={{ bg: 'bg-slate-100', text: 'text-slate-600', bar: 'bg-slate-500' }} subtext="Loyer, factures, abonnements..." />
                    {isExpert && (<BudgetRow label="Investissements" icon={PiggyBank} amount={stats.profitableExpenses} total={stats.monthlyIncome} color={{ bg: 'bg-purple-100', text: 'text-purple-600', bar: 'bg-purple-500' }} subtext={`Proj. +${formatCurrency(stats.projectedAnnualYield)}/an`} />)}
                    <BudgetRow label="Vie Courante" icon={ShoppingCart} amount={stats.discretionaryExpenses} total={stats.monthlyIncome} color={{ bg: 'bg-indigo-100', text: 'text-indigo-600', bar: 'bg-indigo-500' }} subtext="Courses, plaisirs (lissé)" />
                    <div className="h-px bg-slate-100 my-6 mx-4"></div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${stats.capacityToSave > 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                {stats.capacityToSave > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                            </div>
                            <div>
                                <div className="font-bold text-slate-800 text-sm">Capacité d&apos;Épargne</div>
                                <div className="text-[10px] text-slate-500 font-medium uppercase">Cashflow Net</div>
                            </div>
                        </div>
                        <div className={`text-2xl font-black ${stats.capacityToSave > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(stats.capacityToSave)}
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-auto">
                <Card className="p-6 border-t-4 border-t-amber-500 h-full">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Shield className="text-amber-500" size={20} /> Sécurité</h3>
                        <Badge color={stats.safetyMonths >= stats.rules.safetyMonths ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                            {stats.safetyMonths >= stats.rules.safetyMonths ? "Objectif Atteint" : "En construction"}
                        </Badge>
                    </div>
                    <div className="flex justify-between items-end mb-2">
                      <div className="text-xs text-slate-500">Matelas de sécu.</div>
                      <div className="font-bold text-slate-700">{stats.safetyMonths.toFixed(1)} mois</div>
                    </div>
                    <ProgressBar value={stats.safetyMonths} max={stats.rules.safetyMonths} colorClass="bg-amber-500" />
                    <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                        {stats.safetyMonths >= stats.rules.safetyMonths ? "Bravo ! Ton épargne couvre largement les imprévus." : <>Il te manque encore <strong>{formatCurrency(Math.max(0, (stats.rules.safetyMonths * stats.mandatoryExpenses) - stats.matelas))}</strong> pour être serein.</>}
                    </p>
                </Card>

                {isExpert ? (
                    <Card className="p-6 border-t-4 border-t-purple-500 h-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><TrendingUp className="text-purple-500" size={20} /> Croissance</h3>
                            <Badge color="bg-purple-100 text-purple-700">Long terme</Badge>
                        </div>
                        <div className="flex justify-between items-end mb-2">
                            <div className="text-xs text-slate-500">Capital Investi</div>
                            <div className="font-bold text-purple-700">{formatCurrency(stats.investments)}</div>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, (stats.investments / (stats.totalWealth || 1)) * 100)}%` }}></div>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Tes investissements représentent <strong>{Math.round((stats.investments / (stats.totalWealth || 1)) * 100)}%</strong> de ton patrimoine.
                        </p>
                    </Card>
                ) : (
                    <Card className="p-6 border-t-4 border-t-rose-500 h-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><CreditCard className="text-rose-500" size={20} /> Pression</h3>
                            <Badge color={stats.engagementRate > stats.rules.maxDebt ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}>
                                {stats.engagementRate > stats.rules.maxDebt ? "Élevée" : "Saine"}
                            </Badge>
                        </div>
                        <div className="flex justify-between items-end mb-2">
                            <div className="text-xs text-slate-500">Revenus engagés</div>
                            <div className="font-bold text-slate-700">{stats.engagementRate.toFixed(0)}%</div>
                        </div>
                        <ProgressBar value={stats.engagementRate} max={60} colorClass={stats.engagementRate > stats.rules.maxDebt ? 'bg-rose-500' : 'bg-emerald-500'} />
                        <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                            {stats.engagementRate > stats.rules.maxDebt ? "Attention, tes charges fixes sont trop hautes." : "C'est bien ! Tu gardes une bonne marge de manœuvre."}
                        </p>
                    </Card>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. LE COMPOSANT HOME PRINCIPAL (L'aiguilleur)
// ============================================================================

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // SCÉNARIO A : NON CONNECTÉ (Page de Login Améliorée)
  // -> Mobile : Login pur et centré
  // -> PC : Layout Split (Marketing à gauche, Login à droite)
  if (!isSignedIn) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex md:grid md:grid-cols-2">
        
        {/* COLONNE GAUCHE (Visible uniquement sur PC > 768px) */}
        <div className="hidden md:flex flex-col justify-center p-12 lg:p-20 bg-indigo-600 text-white relative overflow-hidden">
           {/* Décoration de fond */}
           <div className="absolute top-0 right-0 p-40 bg-white opacity-5 rounded-full blur-3xl transform translate-x-20 -translate-y-20"></div>
           <div className="absolute bottom-0 left-0 p-32 bg-black opacity-10 rounded-full blur-3xl transform -translate-x-10 translate-y-10"></div>

           <div className="max-w-md mx-auto space-y-8 relative z-10">
             <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-xl">
               <TrendingUp size={32} className="text-white" />
             </div>
             
             <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-tight">
               Prenez le contrôle de votre argent.
             </h1>
             
             <p className="text-indigo-100 text-lg leading-relaxed">
               Fini le stress des fins de mois. Visualisez, planifiez et optimisez votre budget en temps réel avec Mon Coach Financier.
             </p>
             
             <div className="space-y-4 pt-4">
                <div className="flex items-center gap-3 text-indigo-100">
                  <CheckCircle2 className="text-emerald-400" /> <span>100% Sécurisé & Privé</span>
                </div>
                <div className="flex items-center gap-3 text-indigo-100">
                  <CheckCircle2 className="text-emerald-400" /> <span>Analyse automatique</span>
                </div>
                <div className="flex items-center gap-3 text-indigo-100">
                  <CheckCircle2 className="text-emerald-400" /> <span>Accessible partout (PC & Mobile)</span>
                </div>
             </div>
           </div>
        </div>

        {/* COLONNE DROITE (Formulaire Login) */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-12 bg-slate-50">
          <div className="w-full max-w-md">
             {/* En-tête visible uniquement sur Mobile */}
             <div className="md:hidden text-center mb-8">
               <div className="mx-auto h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg mb-4">
                 <TrendingUp size={24} className="text-white" />
               </div>
               <h1 className="text-2xl font-black text-slate-900">Mon Coach</h1>
               <p className="text-slate-500">Connectez-vous pour accéder à votre espace.</p>
             </div>

             <SignIn 
               signUpUrl="/sign-up"
               routing="hash" 
               appearance={clerkAppearanceHybrid} // Utilise le nouveau thème responsive
             />
          </div>
        </div>
      </div>
    );
  }

  // SCÉNARIO B : CONNECTÉ (Dashboard)
  return <DashboardView />;
}