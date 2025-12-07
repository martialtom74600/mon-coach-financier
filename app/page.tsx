'use client';

import React, { useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, SignIn, SignUp, useUser } from '@clerk/nextjs';
import { clerkAppearanceHybrid } from '@/app/config/clerk-theme';

// --- IMPORTS DU MOTEUR ---
import { useFinancialData } from '@/app/hooks/useFinancialData';
import { 
  computeFinancialPlan, 
  analyzeProfileHealth, 
  DeepAnalysis, 
  OptimizationOpportunity 
} from '@/app/lib/engine';

// --- IMPORTS UTILITAIRES ---
import { formatCurrency, calculateListTotal } from '@/app/lib/definitions';

// --- IMPORTS UI & ICONS ---
import Button from '@/app/components/ui/Button';
import Badge from '@/app/components/ui/Badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import {
  TrendingUp, ArrowRight, Zap, Layers, Wallet, Settings, Rocket, 
  AlertOctagon, BookOpen, X, CheckSquare, Stethoscope, ShieldCheck, 
  XCircle, PiggyBank, Crown, Target
} from 'lucide-react';

// ============================================================================
// 1. CONFIG & HELPERS (Inchangé)
// ============================================================================

const COLORS = {
  needs: '#6366f1',
  wants: '#a855f7',
  savings: '#10b981',
};

const getTheme = (level: string) => {
  switch (level) {
    case 'CRITICAL': return { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-900', icon: 'text-rose-600', badge: 'bg-rose-100 text-rose-700' };
    case 'WARNING':  return { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-900', icon: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' };
    case 'SUCCESS':  return { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-900', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' };
    default:         return { bg: 'bg-slate-50', border: 'border-slate-100', text: 'text-slate-900', icon: 'text-slate-500', badge: 'bg-slate-100 text-slate-700' };
  }
};

const getIcon = (type: string) => {
  switch (type) {
    case 'SAVINGS': return ShieldCheck;
    case 'DEBT': return XCircle;
    case 'INVESTMENT': return TrendingUp;
    case 'BUDGET': return Wallet;
    default: return PiggyBank;
  }
};

// ============================================================================
// 2. COMPOSANTS D'ACTIONS (Inchangé)
// ============================================================================

const EducationalModal = ({ guide, onClose }: { guide: any, onClose: () => void }) => {
    if (!guide) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="bg-indigo-600 p-6 text-white flex justify-between items-start shrink-0">
                    <div className="flex gap-4">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md shrink-0 border border-white/10"><BookOpen size={24} /></div>
                        <div>
                            <h3 className="text-xl font-bold leading-tight">{guide.title}</h3>
                            <p className="text-indigo-100 text-sm mt-1 leading-relaxed opacity-90">{guide.definition}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors shrink-0"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <CheckSquare size={16} className="text-emerald-500" /> Plan d'action
                        </h4>
                        <ul className="space-y-4">
                            {guide.steps.map((step: string, i: number) => (
                                <li key={i} className="flex gap-3 text-sm text-slate-600 leading-relaxed group">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-xs border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">{i + 1}</span>
                                    <span>{step}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                    <Button onClick={onClose} className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg">C'est noté</Button>
                </div>
            </div>
        </div>
    );
};

const HeroAction = ({ opp, onAction }: { opp: OptimizationOpportunity, onAction: () => void }) => {
  const isClickable = !!opp.guide || !!opp.link;
  return (
    <div 
      className={`relative overflow-hidden rounded-2xl bg-slate-900 text-white shadow-xl shadow-slate-200 group ${isClickable ? 'cursor-pointer hover:shadow-2xl hover:scale-[1.005] transition-all' : ''}`} 
      onClick={isClickable ? onAction : undefined}
    >
      <div className="absolute top-0 right-0 -mt-20 -mr-20 h-80 w-80 rounded-full bg-indigo-600/30 blur-3xl group-hover:bg-indigo-500/40 transition-all duration-500"></div>
      
      <div className="relative z-10 p-8">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-inner shrink-0">
                {opp.level === 'CRITICAL' ? <AlertOctagon size={32} className="text-rose-400 animate-pulse" /> : <Zap size={32} className="text-amber-400" />}
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${opp.level === 'CRITICAL' ? 'bg-rose-500/20 text-rose-200 border border-rose-500/30' : 'bg-amber-500/20 text-amber-200 border border-amber-500/30'}`}>
                        {opp.level === 'CRITICAL' ? 'Priorité Haute' : 'Opportunité'}
                    </span>
                    {opp.potentialGain && <span className="text-emerald-400 text-xs font-bold">+{formatCurrency(opp.potentialGain)}/an</span>}
                </div>
                <h3 className="text-2xl font-bold leading-tight mb-2 text-white">{opp.title}</h3>
                <p className="text-slate-300 leading-relaxed text-sm md:text-base max-w-2xl">{opp.message}</p>
            </div>
            
            {opp.actionLabel && (
                <div className="mt-4 md:mt-0 w-full md:w-auto shrink-0">
                    <Button className="w-full bg-white text-slate-900 hover:bg-indigo-50 border-0 shadow-lg font-bold flex items-center justify-center gap-2 py-3 px-6 rounded-xl">
                        {opp.actionLabel}
                        {opp.guide ? <BookOpen size={18}/> : <ArrowRight size={18} />}
                    </Button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

const OpportunityItem = ({ opp, onAction }: { opp: OptimizationOpportunity, onAction: () => void }) => {
  const theme = getTheme(opp.level);
  const Icon = getIcon(opp.type);
  const isClickable = !!opp.guide || !!opp.link;

  return (
    <div 
      onClick={isClickable ? onAction : undefined} 
      className={`p-5 rounded-xl border ${theme.border} ${theme.bg} flex gap-4 transition-all relative group items-start ${isClickable ? 'hover:shadow-md cursor-pointer hover:border-indigo-200 hover:bg-white' : ''}`}
    >
      <div className={`mt-1 flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-white ${theme.icon} border border-slate-100 shadow-sm`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2 mb-1">
          <h4 className={`font-bold text-sm ${theme.text} truncate`}>{opp.title}</h4>
          {opp.potentialGain && (
             <Badge size="sm" className="bg-white border-emerald-100 text-emerald-600 shadow-sm whitespace-nowrap shrink-0">
                +{formatCurrency(opp.potentialGain)}
             </Badge>
          )}
        </div>
        <p className={`text-xs text-slate-600 leading-relaxed mb-1 opacity-90 ${isClickable ? 'pr-2' : ''}`}>{opp.message}</p>
      </div>
    </div>
  );
};

const KpiCard = ({ icon: Icon, label, value, subtext, trend, colorClass = "text-slate-900" }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow group">
        <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                <Icon size={20} />
            </div>
            {trend && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">{trend}</span>}
        </div>
        <div>
            <div className={`text-3xl font-black tracking-tight ${colorClass} mb-1`}>{value}</div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</div>
            {subtext && <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-50">{subtext}</div>}
        </div>
    </div>
);

// ============================================================================
// 3. DASHBOARD VIEW (VERSION FINALE PROPRE)
// ============================================================================

function DashboardView() {
  const router = useRouter();
  const { user } = useUser();
  const { profile, isLoaded: isProfileLoaded } = useFinancialData();
  
  // --- ENGINE CONNECTION ---
  const analysis: DeepAnalysis | null = useMemo(() => {
      if (!profile || !profile.incomes) return null;
      try {
          const budgetContext = computeFinancialPlan(profile);
          return analyzeProfileHealth(profile, budgetContext.budget);
      } catch (e) {
          console.error("Engine Error:", e);
          return null;
      }
  }, [profile]);

  const [selectedGuide, setSelectedGuide] = useState<any | null>(null);

  const handleAction = (opp: OptimizationOpportunity) => {
      if (opp.guide) setSelectedGuide(opp.guide);
      else if (opp.link) router.push(opp.link);
  };

  if (!isProfileLoaded) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-spin h-10 w-10 border-b-2 border-indigo-600 rounded-full"></div></div>;

  // Empty State (Simplifié pour le layout)
  if (!analysis || analysis.ratios.needs === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="max-w-md w-full space-y-6">
            <h2 className="text-2xl font-black text-slate-900">Initialisation...</h2>
            <p className="text-slate-500">Nous avons besoin de vos données pour commencer.</p>
            <Button onClick={() => router.push('/profile')} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                Configurer mon profil <ArrowRight size={20} className="ml-2"/>
            </Button>
        </div>
      </div>
    );
  }

  // Data prep
  const chartData = [
    { name: 'Besoins', value: analysis.ratios.needs, color: COLORS.needs },
    { name: 'Plaisirs', value: analysis.ratios.wants, color: COLORS.wants },
    { name: 'Épargne', value: analysis.ratios.savings, color: COLORS.savings },
  ].filter(d => d.value > 0);

  const sortedOpps = [...analysis.opportunities].sort((a, b) => {
      const priority = { 'CRITICAL': 0, 'WARNING': 1, 'SUCCESS': 2, 'INFO': 3 };
      return (priority[a.level as keyof typeof priority] || 99) - (priority[b.level as keyof typeof priority] || 99);
  });

  const heroAction = sortedOpps[0];
  const secondaryActions = sortedOpps.slice(1);
  const scoreColor = analysis.globalScore >= 80 ? 'text-emerald-600' : analysis.globalScore >= 50 ? 'text-amber-500' : 'text-rose-500';
  const scoreBg = analysis.globalScore >= 80 ? 'bg-emerald-50' : analysis.globalScore >= 50 ? 'bg-amber-50' : 'bg-rose-50';
  const monthlySavingsAmount = calculateListTotal(profile.incomes) * (analysis.ratios.savings / 100);

  return (
    // NOTE : Pas de marges, pas de padding, pas de max-w. Le layout s'en charge.
    <div className="space-y-8 animate-fade-in">
      
      {selectedGuide && <EducationalModal guide={selectedGuide} onClose={() => setSelectedGuide(null)} />}
        
      {/* --- SECTION 1: KPI VITAUX --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KpiCard 
                icon={Layers} 
                label="Patrimoine Net Estimé" 
                value={formatCurrency(analysis.projections.wealth10y > 0 ? analysis.projections.wealth10y * 0.35 : 0)} 
                subtext="Actifs - Dettes (Projection)"
            />
            
            <KpiCard 
                icon={PiggyBank} 
                label="Capacité d'épargne" 
                value={formatCurrency(monthlySavingsAmount) + '/mois'}
                trend={`${Math.round(analysis.ratios.savings)}% du revenu`}
                subtext="Carburant de votre richesse"
                colorClass="text-emerald-600"
            />

            <KpiCard 
                icon={Rocket} 
                label="Liberté Financière (FIRE)" 
                value={analysis.projections.fireYear < 99 ? `${analysis.projections.fireYear} ans` : "---"} 
                subtext={analysis.projections.fireYear < 99 ? "Avant l'indépendance totale" : "Objectif à définir"}
                colorClass="text-indigo-600"
            />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* --- SECTION 2: PLAN D'ACTION (GAUCHE - 2/3) --- */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Target className="text-indigo-600"/> Actions Prioritaires
                    </h2>
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{analysis.opportunities.length} détectées</span>
                </div>

                {/* HERO ACTION */}
                {heroAction ? (
                    <HeroAction opp={heroAction} onAction={() => handleAction(heroAction)} />
                ) : (
                    <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-100">
                        <Crown size={48} className="text-emerald-500 mx-auto mb-4"/>
                        <h3 className="text-lg font-bold text-emerald-800 mb-2">Situation Optimale !</h3>
                        <p className="text-emerald-700/80">Aucune action urgente. Profitez de la vue.</p>
                    </div>
                )}

                {/* GRILLE SECONDAIRE */}
                {secondaryActions.length > 0 && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {secondaryActions.map((opp) => (
                            <OpportunityItem key={opp.id} opp={opp} onAction={() => handleAction(opp)} />
                        ))}
                    </div>
                )}
            </div>

            {/* --- SECTION 3: SANTÉ & PROJECTIONS (DROITE - 1/3) --- */}
            <div className="space-y-6">
                
                {/* CARTE SANTÉ */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative overflow-hidden">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Score de Santé</h3>
                    
                    <div className="flex items-center justify-center py-4 relative">
                        <div className={`absolute inset-0 opacity-10 blur-2xl rounded-full ${scoreBg} transform scale-150`}></div>
                        
                        <div className="h-48 w-full relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={6}>
                                        {chartData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <RechartsTooltip formatter={(val: number) => `${Math.round(val)}%`} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className={`text-4xl font-black ${scoreColor}`}>{analysis.globalScore}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">Global</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 mt-4">
                         <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-slate-600"><span className="w-2 h-2 rounded-full bg-indigo-500"></span>Besoins (50%)</span>
                            <span className="font-bold text-slate-900">{Math.round(analysis.ratios.needs)}%</span>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-slate-600"><span className="w-2 h-2 rounded-full bg-purple-500"></span>Plaisirs (30%)</span>
                            <span className="font-bold text-slate-900">{Math.round(analysis.ratios.wants)}%</span>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-slate-600"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Épargne (20%)</span>
                            <span className="font-bold text-slate-900">{Math.round(analysis.ratios.savings)}%</span>
                         </div>
                    </div>
                </div>

                {/* CARTE VISION */}
                <div className="bg-slate-900 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-16 bg-indigo-500 opacity-20 blur-3xl rounded-full -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                        <h3 className="text-sm font-bold text-indigo-200 uppercase tracking-wider mb-6 flex items-center gap-2">
                             <TrendingUp size={14}/> Vision Long Terme
                        </h3>
                        
                        <div className="space-y-6">
                            <div>
                                <div className="text-3xl font-bold">{formatCurrency(analysis.projections.wealth10y)}</div>
                                <div className="text-xs text-slate-400 mt-1">Patrimoine projeté dans 10 ans</div>
                                <div className="w-full bg-slate-800 h-1.5 mt-3 rounded-full overflow-hidden">
                                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: '40%' }}></div>
                                </div>
                            </div>
                             <div>
                                <div className="text-3xl font-bold text-emerald-400">{formatCurrency(analysis.projections.wealth20y)}</div>
                                <div className="text-xs text-slate-400 mt-1">Dans 20 ans (Intérêts composés)</div>
                            </div>
                        </div>
                        
                        <div className="mt-6 pt-4 border-t border-slate-800">
                             <p className="text-[10px] text-slate-500 leading-relaxed">
                                Basé sur un rendement moyen de 5% et votre épargne actuelle.
                            </p>
                        </div>
                    </div>
                </div>

            </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. AUTH SCREEN (DOIT REMPLIR L'ECRAN SI PAS DE LAYOUT)
// ============================================================================

function AuthScreen() {
    const searchParams = useSearchParams();
    const isSignUpMode = searchParams.get('mode') === 'signup';
    const router = useRouter(); 
    const switchToSignIn = () => { router.replace('/?mode=login'); };
    const switchToSignUp = () => { router.replace('/?mode=signup'); };
    
    // NOTE: Ici le layout est en mode "p-0" quand déconnecté, donc on garde le min-h-screen
    return (
      <div className="min-h-screen w-full bg-slate-50 flex md:grid md:grid-cols-2">
        <div className="hidden md:flex flex-col justify-center p-12 lg:p-20 bg-slate-900 text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 p-40 bg-indigo-500 opacity-20 rounded-full blur-3xl transform translate-x-20 -translate-y-20"></div>
           <div className="max-w-md mx-auto space-y-8 relative z-10">
             <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-xl"><TrendingUp size={32} /></div>
             <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                {isSignUpMode ? "Construisez votre empire." : "Pilotez vos finances."}
             </h1>
             <p className="text-slate-400 text-lg">L'intelligence artificielle au service de votre patrimoine.</p>
           </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-12 bg-white">
          <div className="w-full max-w-md">
              <div className="md:hidden text-center mb-8"><h1 className="text-2xl font-black text-slate-900">Finance Engine</h1></div>
              {isSignUpMode ? (
                <SignUp key="signup" routing="virtual" appearance={{ baseTheme: clerkAppearanceHybrid, elements: { footerActionLink: "cursor-pointer text-indigo-600 hover:text-indigo-700 font-bold" } }} signInUrl="/?mode=login" afterSignInUrl="/"><div className="cl-footer-action-custom text-sm text-center mt-6"><span className="text-slate-500">Déjà membre ?</span><a onClick={switchToSignIn} className="cursor-pointer text-indigo-600 hover:text-indigo-700 font-bold ml-1">S'identifier</a></div></SignUp>
              ) : (
                <SignIn key="login" routing="virtual" appearance={{ baseTheme: clerkAppearanceHybrid, elements: { footerActionLink: "cursor-pointer text-indigo-600 hover:text-indigo-700 font-bold" } }} signUpUrl="/?mode=signup" afterSignUpUrl="/"><div className="cl-footer-action-custom text-sm text-center mt-6"><span className="text-slate-500">Nouveau ?</span><a onClick={switchToSignUp} className="cursor-pointer text-indigo-600 hover:text-indigo-700 font-bold ml-1">Créer un compte</a></div></SignIn>)}
          </div>
        </div>
      </div>
    );
}

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  if (!isSignedIn) return <Suspense fallback={<div>Loading...</div>}><AuthScreen /></Suspense>;
  return <DashboardView />;
}