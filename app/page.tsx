'use client';

import React, { useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, SignIn, SignUp } from '@clerk/nextjs';
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
// J'ai ajouté calculateListTotal ici pour corriger l'erreur de calcul
import { formatCurrency, calculateListTotal } from '@/app/lib/definitions';

// --- IMPORTS UI & ICONS ---
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Badge from '@/app/components/ui/Badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import {
  TrendingUp, ArrowRight, Zap, Layers, Wallet, Settings, Rocket, 
  AlertOctagon, BookOpen, X, CheckSquare, Stethoscope, ShieldCheck, 
  XCircle, PiggyBank, Crown
} from 'lucide-react';

// ============================================================================
// 1. HELPERS VISUELS
// ============================================================================

const COLORS = {
  needs: '#6366f1',   // Indigo
  wants: '#a855f7',   // Purple
  savings: '#10b981', // Emerald
};

const getTheme = (level: string) => {
  switch (level) {
    case 'CRITICAL': return { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-900', icon: 'text-rose-600' };
    case 'WARNING':  return { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-900', icon: 'text-amber-600' };
    case 'SUCCESS':  return { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-900', icon: 'text-emerald-600' };
    default:         return { bg: 'bg-slate-50', border: 'border-slate-100', text: 'text-slate-900', icon: 'text-slate-500' };
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
// 2. COMPOSANTS D'ACTIONS
// ============================================================================

// MODALE PÉDAGOGIQUE
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
                    {guide.tips && guide.tips.length > 0 && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-2"><Zap size={14} /> Le conseil pro</h4>
                            <ul className="space-y-1">
                                {guide.tips.map((tip: string, i: number) => (
                                    <li key={i} className="text-xs text-amber-900/80 pl-2 border-l-2 border-amber-200">{tip}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                    <Button onClick={onClose} className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg">C'est noté, je passe à l'action !</Button>
                </div>
            </div>
        </div>
    );
};

// HERO ACTION (GRANDE CARTE)
const HeroAction = ({ opp, onAction }: { opp: OptimizationOpportunity, onAction: () => void }) => {
  const isClickable = !!opp.guide || !!opp.link;
  return (
    <div 
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 text-white shadow-xl shadow-indigo-200/50 group ${isClickable ? 'cursor-pointer hover:shadow-2xl hover:scale-[1.01] transition-all' : ''}`} 
      onClick={isClickable ? onAction : undefined}
    >
      <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl group-hover:bg-white/15 transition-all duration-500"></div>
      
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner shrink-0">
                {opp.level === 'CRITICAL' ? <AlertOctagon size={32} className="text-rose-300 animate-pulse" /> : <Zap size={32} className="text-amber-300" />}
            </div>
            <div className="flex-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider mb-3 border border-white/10">
                   {opp.level === 'CRITICAL' ? 'Priorité Absolue' : 'Opportunité Stratégique'}
                </div>
                <h3 className="text-2xl font-bold leading-tight mb-2">{opp.title}</h3>
                <p className="text-indigo-100 opacity-90 leading-relaxed text-sm md:text-base max-w-2xl">{opp.message}</p>
            </div>
            
            {opp.actionLabel && (
                <div className="mt-4 md:mt-0 w-full md:w-auto shrink-0">
                    <Button className="w-full bg-white text-indigo-900 hover:bg-indigo-50 border-0 shadow-lg font-bold flex items-center justify-center gap-2 py-3 px-6">
                        {opp.guide ? <BookOpen size={18}/> : <ArrowRight size={18} />}
                        {opp.actionLabel}
                    </Button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

// OPPORTUNITY ITEM (PETITE CARTE)
const OpportunityItem = ({ opp, onAction }: { opp: OptimizationOpportunity, onAction: () => void }) => {
  const theme = getTheme(opp.level);
  const Icon = getIcon(opp.type);
  const isClickable = !!opp.guide || !!opp.link;

  return (
    <div 
      onClick={isClickable ? onAction : undefined} 
      className={`p-5 rounded-xl border ${theme.border} ${theme.bg} flex gap-4 transition-all relative group items-start ${isClickable ? 'hover:shadow-md cursor-pointer hover:border-indigo-200' : ''}`}
    >
      <div className={`mt-1 flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-white ${theme.icon} border border-slate-100 shadow-sm`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2 mb-1">
          <h4 className={`font-bold text-sm ${theme.text} truncate`}>{opp.title}</h4>
          {opp.potentialGain && (
             <Badge size="sm" className="bg-white border-slate-200 text-emerald-600 shadow-sm whitespace-nowrap shrink-0">
                +{formatCurrency(opp.potentialGain)}/an
             </Badge>
          )}
        </div>
        <p className={`text-xs text-slate-600 leading-relaxed mb-1 opacity-90 ${isClickable ? 'pr-2' : ''}`}>{opp.message}</p>
        
        {isClickable && (
          <div className="flex items-center gap-2 mt-3">
              <span className={`text-[10px] font-bold uppercase tracking-wider text-indigo-600 opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-1`}>
                {opp.actionLabel || "Voir l'action"} {opp.guide ? <BookOpen size={12}/> : <ArrowRight size={12}/>}
              </span>
          </div>
        )}
      </div>
    </div>
  );
};

// KPI CARD (HEADER)
const KpiCard = ({ icon: Icon, label, value, subtext, trend, colorClass = "text-slate-900" }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Icon size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </div>
        <div>
            <div className={`text-2xl lg:text-3xl font-black tracking-tight ${colorClass}`}>{value}</div>
            <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-slate-400 font-medium">{subtext}</span>
                {trend && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{trend}</span>}
            </div>
        </div>
    </div>
);

// ============================================================================
// 3. DASHBOARD VIEW
// ============================================================================

function DashboardView() {
  const router = useRouter();
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

  if (!isProfileLoaded) return <div className="min-h-[80vh] flex items-center justify-center"><div className="animate-spin h-10 w-10 border-b-2 border-indigo-600 rounded-full"></div></div>;

  // Empty State
  if (!analysis || analysis.ratios.needs === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-fade-in px-4">
        <div className="p-8 bg-white rounded-3xl shadow-xl border border-slate-100 mb-8 transform hover:scale-105 transition-transform duration-500">
            <div className="h-20 w-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-6"><Settings size={40} /></div>
            <h2 className="text-2xl font-black text-slate-800 mb-3">Initialisation du Moteur</h2>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto text-sm leading-relaxed">L'IA a besoin de vos données pour générer votre stratégie.</p>
            <Button onClick={() => router.push('/profile')} className="w-full py-3 shadow-lg bg-slate-900 text-white hover:bg-indigo-600">Lancer l'analyse <ArrowRight size={18}/></Button>
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

  const heroAction = sortedOpps[0]; // La plus importante est toujours en Hero
  const secondaryActions = sortedOpps.slice(1); // Le reste en grille

  const scoreColor = analysis.globalScore >= 80 ? 'text-emerald-600' : analysis.globalScore >= 50 ? 'text-amber-500' : 'text-rose-500';

  return (
    <div className="animate-fade-in pb-20">
      {selectedGuide && <EducationalModal guide={selectedGuide} onClose={() => setSelectedGuide(null)} />}

      <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* --- 1. HEADER : KPI VITAUX (LIGNE DU HAUT) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* KPI 1 : SANTÉ GLOBALE (Score) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6 hover:shadow-md transition-shadow">
                <div className="h-20 w-20 relative shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={chartData} cx="50%" cy="50%" innerRadius={28} outerRadius={38} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={4}>
                                {chartData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className={`absolute inset-0 flex items-center justify-center font-black text-xl ${scoreColor}`}>{analysis.globalScore}</div>
                </div>
                <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Santé Financière</div>
                    <div className="flex flex-wrap gap-1.5">
                        {analysis.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-bold">{tag}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPI 2 : PATRIMOINE */}
            <KpiCard 
                icon={Layers} 
                label="Patrimoine Net Estimé" 
                value={formatCurrency(analysis.projections.wealth10y > 0 ? analysis.projections.wealth10y * 0.35 : 0)} 
                subtext="Projection actuelle"
                colorClass="text-slate-900"
            />

            {/* KPI 3 : INDÉPENDANCE */}
            <KpiCard 
                icon={Rocket} 
                label="Liberté Financière" 
                value={analysis.projections.fireYear < 99 ? `${analysis.projections.fireYear} ans` : "---"} 
                subtext={analysis.projections.fireYear < 99 ? "Avant l'indépendance" : "Objectif non défini"}
                trend={analysis.projections.fireYear < 99 ? "En cours" : undefined}
                colorClass="text-indigo-600"
            />
        </div>

        {/* --- 2. CONTENU PRINCIPAL --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* GAUCHE : LE DOCTEUR FINANCIER (Action Plan) */}
            <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><Stethoscope size={18}/></div>
                    <h2 className="text-lg font-bold text-slate-800">Diagnostic & Opportunités</h2>
                </div>

                {/* HERO ACTION (Si dispo) */}
                {heroAction ? (
                    <div className="animate-slide-up">
                        <HeroAction opp={heroAction} onAction={() => handleAction(heroAction)} />
                    </div>
                ) : (
                    <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-100">
                        <div className="inline-flex p-3 bg-white rounded-full text-emerald-500 mb-4 shadow-sm"><Crown size={32}/></div>
                        <h3 className="text-lg font-bold text-emerald-800 mb-2">Situation Optimale !</h3>
                        <p className="text-emerald-700/80 text-sm">Aucune action urgente détectée. Continuez comme ça.</p>
                    </div>
                )}

                {/* GRILLE DES AUTRES ACTIONS */}
                {secondaryActions.length > 0 && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
                        {secondaryActions.map((opp) => (
                            <OpportunityItem key={opp.id} opp={opp} onAction={() => handleAction(opp)} />
                        ))}
                    </div>
                )}
            </div>

            {/* DROITE : VISION LONG TERME (Projections) */}
            <div className="lg:col-span-4 space-y-6">
                 <div className="flex items-center gap-3 mb-2">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><TrendingUp size={18}/></div>
                    <h2 className="text-lg font-bold text-slate-800">Vision Long Terme</h2>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
                    {/* Projection 10 ans */}
                    <div className="relative pl-4 border-l-2 border-slate-100">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dans 10 ans</div>
                        <div className="text-2xl font-black text-slate-800">{formatCurrency(analysis.projections.wealth10y)}</div>
                        <div className="text-xs text-slate-500 mt-1">Patrimoine projeté</div>
                    </div>

                    {/* Projection 20 ans */}
                    <div className="relative pl-4 border-l-2 border-indigo-100">
                         <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Dans 20 ans</div>
                        <div className="text-2xl font-black text-indigo-900">{formatCurrency(analysis.projections.wealth20y)}</div>
                        <div className="text-xs text-indigo-400 mt-1">Effet boule de neige</div>
                    </div>

                    <div className="pt-4 border-t border-slate-50">
                        <p className="text-xs text-slate-400 leading-relaxed italic">
                            *Estimations basées sur votre capacité d'épargne actuelle ({formatCurrency(analysis.ratios.savings > 0 ? calculateListTotal(profile.incomes) * (analysis.ratios.savings/100) : 0)}) et un rendement moyen de 5%.
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
// 4. AUTH & WRAPPER
// ============================================================================

function AuthScreen() {
    const searchParams = useSearchParams();
    const isSignUpMode = searchParams.get('mode') === 'signup';
    const router = useRouter(); 
    const switchToSignIn = () => { router.replace('/?mode=login'); };
    const switchToSignUp = () => { router.replace('/?mode=signup'); };
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
  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  if (!isSignedIn) return <Suspense fallback={<div>Loading...</div>}><AuthScreen /></Suspense>;
  return <DashboardView />;
}