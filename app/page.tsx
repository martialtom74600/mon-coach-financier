'use client';

import React, { useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, SignIn, SignUp } from '@clerk/nextjs';
import { clerkAppearanceHybrid } from '@/app/config/clerk-theme';

// --- IMPORTS RÉELS ---
import { useFinancialData } from '@/app/hooks/useFinancialData';
import { calculateFinancials, formatCurrency } from '@/app/lib/logic';

// --- IMPORTS UI ---
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import FinancialDoctor from '@/app/components/FinancialDoctor'; // Le nouveau composant intelligent

import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Zap,
  Layers,
  Wallet,
  CreditCard,
  ShoppingCart,
  Settings,
  Target,
  Calendar
} from 'lucide-react';

// ============================================================================
// 1. HELPERS (Composants visuels légers pour le Dashboard)
// ============================================================================

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

const GoalCard = ({ goal }: { goal: any }) => {
    const percent = Math.min(100, (goal.currentSaved / goal.targetAmount) * 100);
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-3 group hover:border-emerald-200 transition-colors">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors">
                        <Target size={18} />
                    </div>
                    <div>
                        <div className="font-bold text-slate-800 text-sm">{goal.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar size={10}/> {new Date(goal.deadline).toLocaleDateString('fr-FR', {year: 'numeric'})}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-bold text-emerald-700 text-sm">{formatCurrency(goal.currentSaved)}</div>
                    <div className="text-[10px] text-slate-400">sur {formatCurrency(goal.targetAmount)}</div>
                </div>
            </div>
            
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-1000 ease-out" style={{ width: `${percent}%` }}></div>
            </div>
            
            <div className="flex justify-between items-center text-[10px] font-medium pt-1 border-t border-slate-50">
                <span className="text-slate-500">Effort mensuel</span>
                <span className="text-emerald-600 font-bold">+{Math.round(goal.monthlyNeed)}€ / mois</span>
            </div>
        </div>
    );
};

// ============================================================================
// 2. DASHBOARD (VUE CONNECTÉE - VERSION ÉPURÉE)
// ============================================================================

function DashboardView() {
  const router = useRouter();
  const { profile, isLoaded } = useFinancialData();
  const stats = useMemo(() => calculateFinancials(profile), [profile]);

  if (!isLoaded) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-pulse h-12 w-12 bg-slate-200 rounded-full"></div></div>;

  // Empty State : Si le profil est vide
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

  return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
        
        {/* --- COLONNE PRINCIPALE (CENTRE - 8 colonnes) --- 
            FOCUS : Santé immédiate et Budget du mois
        */}
        <div className="lg:col-span-8 space-y-8">
            
            {/* 1. LE DOCTEUR (La star du dashboard) */}
            {stats.diagnosis && <FinancialDoctor diagnosis={stats.diagnosis} />}

            {/* 2. LE BUDGET (Le détail opérationnel) */}
            <Card className="p-6 md:p-8 border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Wallet className="text-indigo-600" /> Flux du Mois</h2>
                <div className="space-y-2">
                    <BudgetRow label="Revenus Nets" icon={Wallet} amount={stats.monthlyIncome} total={stats.monthlyIncome} color={{ bg: 'bg-emerald-100', text: 'text-emerald-600', bar: 'bg-emerald-500' }} />
                    
                    <div className="h-px bg-slate-100 my-4 mx-4"></div>
                    
                    <BudgetRow label="Charges Fixes" icon={CreditCard} amount={stats.mandatoryExpenses} total={stats.monthlyIncome} color={{ bg: 'bg-slate-100', text: 'text-slate-600', bar: 'bg-slate-500' }} subtext="Loyer, factures, crédits..." />
                    
                    {stats.totalGoalsEffort > 0 && (
                        <BudgetRow label="Épargne Projets" icon={Target} amount={stats.totalGoalsEffort} total={stats.monthlyIncome} color={{ bg: 'bg-emerald-100', text: 'text-emerald-600', bar: 'bg-emerald-500' }} subtext="Objectifs définis" />
                    )}
                    
                    {(stats.profitableExpenses - stats.totalGoalsEffort) > 0 && (
                        <BudgetRow label="Investissements Libres" icon={TrendingUp} amount={stats.profitableExpenses - stats.totalGoalsEffort} total={stats.monthlyIncome} color={{ bg: 'bg-purple-100', text: 'text-purple-600', bar: 'bg-purple-500' }} subtext="Hors projets" />
                    )}

                    <BudgetRow label="Vie Courante" icon={ShoppingCart} amount={stats.discretionaryExpenses} total={stats.monthlyIncome} color={{ bg: 'bg-indigo-100', text: 'text-indigo-600', bar: 'bg-indigo-500' }} subtext="Courses, plaisirs..." />
                    
                    <div className="h-px bg-slate-100 my-6 mx-4"></div>
                    
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${stats.capacityToSave > 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                {stats.capacityToSave > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                            </div>
                            <div>
                                <div className="font-bold text-slate-800 text-sm">Reste à Épargner</div>
                                <div className="text-[10px] text-slate-500 font-medium uppercase">Potentiel Cashflow</div>
                            </div>
                        </div>
                        <div className={`text-2xl font-black ${stats.capacityToSave > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(stats.capacityToSave)}
                        </div>
                    </div>
                </div>
            </Card>
        </div>

        {/* --- COLONNE SECONDAIRE (DROITE - 4 colonnes) --- 
            FOCUS : Patrimoine, Actions et Objectifs
        */}
        <div className="lg:col-span-4 space-y-6">
            
            {/* 1. ACTION RAPIDE */}
            <Button onClick={() => router.push('/simulator')} className="w-full shadow-lg py-4 bg-slate-900 hover:bg-indigo-600 text-white transition-colors">
                <Zap size={20} /> Simuler un achat
            </Button>

            {/* 2. PATRIMOINE (La "Big Picture") */}
            <Card className="p-6 bg-white border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-20 bg-indigo-50 rounded-full opacity-50 blur-3xl transform translate-x-10 -translate-y-10 group-hover:bg-indigo-100 transition-colors pointer-events-none"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3 text-slate-500">
                        <Layers size={18} /> 
                        <span className="text-xs font-bold uppercase tracking-wider">Patrimoine Net</span>
                    </div>
                    <div className="text-4xl font-black tracking-tight text-slate-900 mb-4">
                        {formatCurrency(stats.totalWealth)}
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">dont Épargne dispo</span>
                            <span className="font-bold text-slate-700">{formatCurrency(stats.matelas)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">dont Investissements</span>
                            <span className="font-bold text-emerald-600">{formatCurrency(stats.investments)}</span>
                        </div>
                    </div>
                </div>
            </Card>
            
            {/* 3. OBJECTIFS (Rappel Compact) */}
            {stats.goalsBreakdown && stats.goalsBreakdown.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            Mes Objectifs
                        </h3>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                            {stats.goalsBreakdown.length}
                        </span>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                        {stats.goalsBreakdown.map((goal: any) => (
                            <GoalCard key={goal.id} goal={goal} />
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
  );
}

// ============================================================================
// 3. AUTH & HOME (Partagé)
// ============================================================================

function AuthScreen() {
    const searchParams = useSearchParams();
    const isSignUpMode = searchParams.get('mode') === 'signup';
    const router = useRouter(); 

    const switchToSignIn = () => {
        router.replace('/?mode=login');
    };

    const switchToSignUp = () => {
        router.replace('/?mode=signup');
    };
  
    return (
      <div className="min-h-screen w-full bg-slate-50 flex md:grid md:grid-cols-2">
        <div className="hidden md:flex flex-col justify-center p-12 lg:p-20 bg-indigo-600 text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 p-40 bg-white opacity-5 rounded-full blur-3xl transform translate-x-20 -translate-y-20"></div>
           <div className="max-w-md mx-auto space-y-8 relative z-10">
             <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-xl"><TrendingUp size={32} /></div>
             
             {isSignUpMode ? (
               <>
                 <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-tight">Rejoignez l'aventure.</h1>
                 <p className="text-indigo-100 text-lg">Créez votre profil et commencez à maîtriser vos finances.</p>
               </>
             ) : (
               <>
                 <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-tight">Prenez le contrôle.</h1>
                 <p className="text-indigo-100 text-lg">Visualisez et optimisez votre budget en temps réel.</p>
               </>
             )}
           </div>
        </div>
  
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-12 bg-slate-50">
          <div className="w-full max-w-md">
              <div className="md:hidden text-center mb-8"><h1 className="text-2xl font-black text-slate-900">Mon Coach</h1></div>
              
              {isSignUpMode ? (
                <SignUp 
                    key="signup"
                    routing="virtual" 
                    appearance={{
                      baseTheme: clerkAppearanceHybrid,
                      elements: {
                        footerActionLink: "cursor-pointer text-indigo-600 hover:text-indigo-700 font-bold"
                      }
                    }} 
                    signInUrl="/?mode=login" 
                    afterSignInUrl="/"
                >
                    <div className="cl-footer-action-custom text-sm text-center mt-6">
                        <span className="text-slate-500">Vous avez déjà un compte ?</span>
                        <a 
                           onClick={switchToSignIn} 
                           className="cursor-pointer text-indigo-600 hover:text-indigo-700 font-bold ml-1"
                        >
                            S'identifier
                        </a>
                    </div>
                </SignUp>
              ) : (
                <SignIn 
                    key="login"
                    routing="virtual" 
                    appearance={{
                        baseTheme: clerkAppearanceHybrid,
                        elements: {
                            footerActionLink: "cursor-pointer text-indigo-600 hover:text-indigo-700 font-bold"
                        }
                    }}
                    signUpUrl="/?mode=signup" 
                    afterSignUpUrl="/"
                >
                    <div className="cl-footer-action-custom text-sm text-center mt-6">
                        <span className="text-slate-500">Vous n'avez pas encore de compte ?</span>
                        <a 
                           onClick={switchToSignUp} 
                           className="cursor-pointer text-indigo-600 hover:text-indigo-700 font-bold ml-1"
                        >
                            S'inscrire
                        </a>
                    </div>
                </SignIn>
              )}
          </div>
        </div>
      </div>
    );
}

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="animate-pulse grid grid-cols-1 lg:grid-cols-12 gap-6">
         <div className="lg:col-span-4 h-96 bg-slate-200 rounded-3xl"></div>
         <div className="lg:col-span-8 h-96 bg-slate-200 rounded-3xl"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
            <AuthScreen />
        </Suspense>
    );
  }

  return <DashboardView />;
}