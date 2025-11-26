'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, SignIn } from '@clerk/nextjs'; 
import { clerkAppearanceHybrid } from '@/app/config/clerk-theme';

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
  ArrowRight,
  Zap,
  Layers,
  Wallet,
  CreditCard,
  ShoppingCart,
  Settings
} from 'lucide-react';

// ============================================================================
// 1. HELPERS (Barres, Jauges...)
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
  { min: 0, max: 40, label: "Fragile", color: "text-rose-500", bg: "bg-rose-500", border: "border-rose-100" },
  { min: 40, max: 70, label: "En construction", color: "text-amber-500", bg: "bg-amber-500", border: "border-amber-100" },
  { min: 70, max: 90, label: "Confort", color: "text-emerald-500", bg: "bg-emerald-500", border: "border-emerald-100" },
  { min: 90, max: 101, label: "Solide", color: "text-indigo-500", bg: "bg-indigo-500", border: "border-indigo-100" },
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
// 2. DASHBOARD (VUE CONNECTÉE)
// ============================================================================

function DashboardView() {
  const router = useRouter();
  const { profile, isLoaded } = useFinancialData();
  const stats = useMemo(() => calculateFinancials(profile), [profile]);

  if (!isLoaded) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-pulse h-12 w-12 bg-slate-200 rounded-full"></div></div>;

  // Cas vide : On garde un conteneur simple car le Layout gère déjà le centrage
  if (stats.monthlyIncome === 0 && stats.matelas === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-fade-in">
        <div className="p-6 bg-indigo-50 rounded-full text-indigo-600 mb-6 shadow-sm animate-bounce-slow"><Settings size={64} /></div>
        <h2 className="text-3xl font-bold text-slate-800 mb-3">Bienvenue !</h2>
        <p className="text-slate-500 mb-8 max-w-md">Configure ton profil pour débloquer ton tableau de bord financier.</p>
        <Button onClick={() => router.push('/profile')} className="shadow-xl">
          Configurer mon profil <ArrowRight size={20} />
        </Button>
      </div>
    );
  }

  // Calculs Scores
  const safetyRatio = Math.min(1, stats.safetyMonths / (stats.rules.safetyMonths || 3));
  const debtRatio = stats.engagementRate / (stats.rules.maxDebt || 33);
  const debtScore = Math.max(0, 50 * (1 - (debtRatio * 0.5)));
  const finalScore = Math.round((safetyRatio * 50) + debtScore);
  const currentLevel = getLevel(finalScore);

  // --- RENDU DU DASHBOARD ---
  // Note : Pas de <main>, pas de padding externe, pas de max-w. Le RootLayout s'en occupe.
  return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
        
        {/* COLONNE GAUCHE (Indicateurs Clés) */}
        <div className="lg:col-span-4 space-y-6">
            
            {/* CARTE SANTÉ */}
            <Card className={`p-6 flex flex-col items-center justify-center text-center relative ${currentLevel.border} border-t-4`}>
                <div className="flex justify-between w-full items-center mb-4 px-2">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Activity size={18} className="text-slate-400"/> Santé Financière</h3>
                    <Badge color={`${currentLevel.bg.replace('bg-', 'bg-opacity-20 text-')} border-none`}>{currentLevel.label}</Badge>
                </div>
                <div className="mb-6 relative z-10"><LevelGauge score={finalScore} level={currentLevel} /></div>
                
                <div className="grid grid-cols-2 gap-3 w-full text-center">
                    <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sécurité</div>
                        <div className="font-bold text-slate-700 text-lg">{Math.round(safetyRatio * 50)}/50</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Dette</div>
                        <div className="font-bold text-slate-700 text-lg">{Math.round(debtScore)}/50</div>
                    </div>
                </div>
            </Card>

            <Button onClick={() => router.push('/simulator')} className="w-full shadow-lg py-4"><Zap size={20} /> Simuler un nouvel achat</Button>

            {/* CARTE PATRIMOINE */}
            <Card className="p-6 bg-slate-900 text-white border-none relative overflow-hidden group hover:shadow-xl transition-all">
                <div className="absolute top-0 right-0 p-32 bg-indigo-500 rounded-full opacity-10 blur-3xl transform translate-x-10 -translate-y-10 group-hover:opacity-20 transition-opacity"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4 text-slate-400">
                        <Layers size={20} /> <span className="text-sm font-bold uppercase tracking-wider">Patrimoine Net</span>
                    </div>
                    <div className="text-4xl font-black tracking-tight mb-1">{formatCurrency(stats.totalWealth)}</div>
                    {stats.investments > 0 && (
                        <div className="text-xs text-slate-400 flex justify-between items-center mt-4 pt-4 border-t border-slate-700">
                            <span>Dont Investi</span>
                            <span className="text-emerald-400 font-bold">{formatCurrency(stats.investments)}</span>
                        </div>
                    )}
                </div>
            </Card>
        </div>

        {/* COLONNE DROITE (Détails) */}
        <div className="lg:col-span-8 space-y-6">
            
            {/* CARTE BUDGET */}
            <Card className="p-6 md:p-8">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Wallet className="text-indigo-600" /> Ton Budget Mensuel</h2>
                <div className="space-y-2">
                    <BudgetRow label="Revenus Nets" icon={Wallet} amount={stats.monthlyIncome} total={stats.monthlyIncome} color={{ bg: 'bg-emerald-100', text: 'text-emerald-600', bar: 'bg-emerald-500' }} />
                    <div className="h-px bg-slate-100 my-4 mx-4"></div>
                    
                    <BudgetRow label="Charges Fixes" icon={CreditCard} amount={stats.mandatoryExpenses} total={stats.monthlyIncome} color={{ bg: 'bg-slate-100', text: 'text-slate-600', bar: 'bg-slate-500' }} subtext="Loyer, factures, crédits..." />
                    
                    {stats.profitableExpenses > 0 && (
                        <BudgetRow label="Investissements" icon={TrendingUp} amount={stats.profitableExpenses} total={stats.monthlyIncome} color={{ bg: 'bg-purple-100', text: 'text-purple-600', bar: 'bg-purple-500' }} subtext="Épargne active" />
                    )}
                    
                    <BudgetRow label="Vie Courante" icon={ShoppingCart} amount={stats.discretionaryExpenses} total={stats.monthlyIncome} color={{ bg: 'bg-indigo-100', text: 'text-indigo-600', bar: 'bg-indigo-500' }} subtext="Courses, plaisirs..." />
                    
                    <div className="h-px bg-slate-100 my-6 mx-4"></div>
                    
                    {/* CAPACITÉ D'ÉPARGNE */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${stats.capacityToSave > 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                {stats.capacityToSave > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                            </div>
                            <div>
                                <div className="font-bold text-slate-800 text-sm">Reste à Épargner</div>
                                <div className="text-[10px] text-slate-500 font-medium uppercase">Cashflow mensuel</div>
                            </div>
                        </div>
                        <div className={`text-2xl font-black ${stats.capacityToSave > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(stats.capacityToSave)}
                        </div>
                    </div>
                </div>
            </Card>

            {/* CARTES SÉCURITÉ & PRESSION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-auto">
                <Card className="p-6 border-t-4 border-t-amber-500 h-full flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Shield className="text-amber-500" size={20} /> Sécurité</h3>
                            <Badge color={stats.safetyMonths >= stats.rules.safetyMonths ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                                {stats.safetyMonths >= stats.rules.safetyMonths ? "Sécurisé" : "En cours"}
                            </Badge>
                        </div>
                        <div className="flex justify-between items-end mb-2">
                            <div className="text-xs text-slate-500">Matelas de sécu.</div>
                            <div className="font-bold text-slate-700">{stats.safetyMonths.toFixed(1)} mois</div>
                        </div>
                        <ProgressBar value={stats.safetyMonths} max={stats.rules.safetyMonths} colorClass="bg-amber-500" />
                    </div>
                    <p className="mt-4 text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                        {stats.safetyMonths >= stats.rules.safetyMonths ? "Top ! Tu es paré(e) aux imprévus." : "Continue de remplir ton livret de précaution."}
                    </p>
                </Card>

                <Card className="p-6 border-t-4 border-t-rose-500 h-full flex flex-col justify-between">
                    <div>
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
                    </div>
                    <p className="mt-4 text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                        {stats.engagementRate > stats.rules.maxDebt ? "Attention, charges fixes trop hautes." : "Tu as une bonne marge de manœuvre."}
                    </p>
                </Card>
            </div>
        </div>
      </div>
  );
}

// ============================================================================
// 3. PAGE PRINCIPALE (Aiguilleur)
// ============================================================================

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();

  // Skeleton léger (le Layout gère déjà le fond blanc)
  if (!isLoaded) {
    return (
      <div className="animate-pulse grid grid-cols-1 lg:grid-cols-12 gap-6">
         <div className="lg:col-span-4 h-96 bg-slate-200 rounded-3xl"></div>
         <div className="lg:col-span-8 h-96 bg-slate-200 rounded-3xl"></div>
      </div>
    );
  }

  // LOGIN PAGE (Plein écran car RootLayout met padding=0 si !isConnected)
  if (!isSignedIn) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex md:grid md:grid-cols-2">
        {/* MARKETING GAUCHE */}
        <div className="hidden md:flex flex-col justify-center p-12 lg:p-20 bg-indigo-600 text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 p-40 bg-white opacity-5 rounded-full blur-3xl transform translate-x-20 -translate-y-20"></div>
           <div className="max-w-md mx-auto space-y-8 relative z-10">
             <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-xl"><TrendingUp size={32} /></div>
             <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-tight">Prenez le contrôle.</h1>
             <p className="text-indigo-100 text-lg">Visualisez et optimisez votre budget en temps réel.</p>
           </div>
        </div>
        {/* LOGIN DROITE */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-12 bg-slate-50">
          <div className="w-full max-w-md">
             <div className="md:hidden text-center mb-8"><h1 className="text-2xl font-black text-slate-900">Mon Coach</h1></div>
             <SignIn signUpUrl="/sign-up" routing="hash" forceRedirectUrl="/" appearance={clerkAppearanceHybrid} />
          </div>
        </div>
      </div>
    );
  }

  return <DashboardView />;
}