'use client';

import React, { useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, SignIn, SignUp, useUser } from '@clerk/nextjs';
import { clerkAppearanceHybrid } from '@/app/config/clerk-theme';
import { isValidElement } from 'react';

// --- IMPORTS ENGINE & DATA ---
import { useFinancialData } from '@/app/hooks/useFinancialData';
import { 
  computeFinancialPlan, 
  analyzeProfileHealth, 
  DeepAnalysis, 
  OptimizationOpportunity 
} from '@/app/lib/logic';
import { formatCurrency } from '@/app/lib/logic';

// --- UI COMPONENTS ---
import Button from '@/app/components/ui/Button';
import Badge from '@/app/components/ui/Badge';
import FinancialSankey from '@/app/components/FinancialSankey';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import {
  TrendingUp, ArrowRight, Zap, Layers, Wallet, Rocket, 
  AlertOctagon, BookOpen, X, CheckSquare, Stethoscope, ShieldCheck, 
  XCircle, PiggyBank, Crown, Target, Activity, HelpCircle, ArrowUpRight, Lock,
  LayoutDashboard, GitGraph // Ajout d'icones si dispo, sinon on utilise celles existantes
} from 'lucide-react';

// ============================================================================
// 0. STYLES
// ============================================================================
const styles = `
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .animate-fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .delay-100 { animation-delay: 100ms; } .delay-200 { animation-delay: 200ms; } .delay-300 { animation-delay: 300ms; }
  .shimmer { background: linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
`;

// ============================================================================
// 1. CONFIG
// ============================================================================
const COLORS = { needs: '#6366f1', wants: '#a855f7', savings: '#10b981' };

const getTheme = (level: string) => {
  switch (level) {
    case 'CRITICAL': return { bg: 'bg-rose-50/50', border: 'border-rose-100', text: 'text-rose-900', iconBg: 'bg-rose-100', icon: 'text-rose-600' };
    case 'WARNING':  return { bg: 'bg-amber-50/50', border: 'border-amber-100', text: 'text-amber-900', iconBg: 'bg-amber-100', icon: 'text-amber-600' };
    case 'SUCCESS':  return { bg: 'bg-emerald-50/50', border: 'border-emerald-100', text: 'text-emerald-900', iconBg: 'bg-emerald-100', icon: 'text-emerald-600' };
    default:         return { bg: 'bg-slate-50/50', border: 'border-slate-100', text: 'text-slate-900', iconBg: 'bg-slate-100', icon: 'text-slate-500' };
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
// 2. UI COMPONENTS
// ============================================================================

const DashboardSkeleton = () => (
  <div className="space-y-8 p-1">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-32 bg-white rounded-2xl border border-slate-100 p-6 flex flex-col justify-between">
          <div className="flex justify-between"><div className="h-8 w-8 rounded-lg shimmer"></div><div className="h-6 w-16 rounded-full shimmer"></div></div>
          <div className="space-y-2"><div className="h-8 w-3/4 rounded shimmer"></div><div className="h-4 w-1/2 rounded shimmer"></div></div>
        </div>
      ))}
    </div>
    <div className="h-12 w-64 mx-auto rounded-xl shimmer"></div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6"><div className="h-64 rounded-2xl shimmer"></div><div className="h-24 rounded-xl shimmer"></div></div>
      <div className="space-y-6"><div className="h-80 rounded-2xl shimmer"></div></div>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl border border-slate-800">
        <p className="font-bold mb-1">{payload[0].name}</p>
        <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.color }}></span>{Math.round(payload[0].value)}% du budget</p>
      </div>
    );
  }
  return null;
};

const KpiCard = ({ icon: Icon, label, value, subtext, trend, colorClass = "text-slate-900", delay = "" }: any) => (
    <div className={`bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full hover:shadow-xl hover:border-indigo-100 transition-all duration-300 group ${delay}`}>
        <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors border border-slate-100"><Icon size={20} /></div>
            {trend && (<span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${trend.includes('%') ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-slate-500 bg-slate-50 border-slate-100'}`}>{trend}</span>)}
        </div>
        <div>
            <div className={`text-3xl font-black tracking-tight ${colorClass} mb-1 group-hover:scale-105 origin-left transition-transform`}>{value}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">{label}</div>
            
            {isValidElement(subtext) ? (
                subtext
            ) : (
                subtext && <div className="text-[11px] text-slate-400/80 pt-3 border-t border-slate-50 flex items-center gap-1"><HelpCircle size={10}/> {subtext}</div>
            )}
        </div>
    </div>
);

// ============================================================================
// 3. BUSINESS COMPONENTS
// ============================================================================

const EducationalModal = ({ guide, onClose }: { guide: any, onClose: () => void }) => {
    if (!guide) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-white/20 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="bg-indigo-600 p-6 text-white flex justify-between items-start shrink-0">
                    <div className="flex gap-4">
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm shrink-0 border border-white/10 shadow-inner"><BookOpen size={24} /></div>
                        <div><h3 className="text-xl font-bold leading-tight">{guide.title}</h3><p className="text-indigo-100 text-sm mt-1 leading-relaxed opacity-90">{guide.definition}</p></div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors shrink-0"><X size={20} /></button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><CheckSquare size={14} className="text-emerald-500" /> Plan d'action</h4>
                    <ul className="space-y-0 relative">
                        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-indigo-50"></div>
                        {guide.steps.map((step: string, i: number) => (
                            <li key={i} className="flex gap-4 relative py-3 group">
                                <span className="relative z-10 flex-shrink-0 w-6 h-6 rounded-full bg-white text-indigo-600 font-bold flex items-center justify-center text-xs border-2 border-indigo-100 group-hover:border-indigo-600 group-hover:scale-110 transition-all shadow-sm">{i + 1}</span>
                                <span className="text-sm text-slate-600 leading-relaxed pt-0.5 group-hover:text-slate-900 transition-colors">{step}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0"><Button onClick={onClose} className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg py-3 rounded-xl transition-all hover:scale-[1.01]">C'est noté</Button></div>
            </div>
        </div>
    );
};

const HeroAction = ({ opp, onAction }: { opp: OptimizationOpportunity, onAction: () => void }) => {
  const isClickable = !!opp.guide || !!opp.link;
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-slate-900 text-white shadow-xl shadow-indigo-900/20 group ${isClickable ? 'cursor-pointer' : ''}`} onClick={isClickable ? onAction : undefined}>
      <div className="absolute top-0 right-0 -mt-20 -mr-20 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl group-hover:bg-indigo-500/40 transition-all duration-700"></div>
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"></div>
      <div className="relative z-10 p-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="relative">
                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner shrink-0 backdrop-blur-md ${opp.level === 'CRITICAL' ? 'bg-rose-500/20' : 'bg-white/10'}`}>
                    {opp.level === 'CRITICAL' ? <AlertOctagon size={32} className="text-rose-400 animate-pulse" /> : <Zap size={32} className="text-amber-400 group-hover:rotate-12 transition-transform duration-500" />}
                </div>
            </div>
            <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm ${opp.level === 'CRITICAL' ? 'bg-rose-500/10 text-rose-200 border-rose-500/20' : 'bg-amber-500/10 text-amber-200 border-amber-500/20'}`}>{opp.level === 'CRITICAL' ? 'Action Requise' : 'Opportunité'}</span>
                    {opp.potentialGain && <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20"><TrendingUp size={10}/> +{formatCurrency(opp.potentialGain)}/an</span>}
                </div>
                <h3 className="text-2xl font-bold leading-tight text-white group-hover:text-indigo-100 transition-colors">{opp.title}</h3>
                <p className="text-slate-300 leading-relaxed text-sm md:text-base max-w-2xl">{opp.message}</p>
            </div>
            {opp.actionLabel && (<div className="mt-4 md:mt-0 w-full md:w-auto shrink-0"><Button className="w-full bg-white text-slate-900 hover:bg-indigo-50 border-0 shadow-lg font-bold flex items-center justify-center gap-2 py-3 px-6 rounded-xl transition-all hover:scale-105 active:scale-95">{opp.actionLabel} {opp.guide ? <BookOpen size={18} className="text-indigo-600"/> : <ArrowRight size={18} className="text-indigo-600" />}</Button></div>)}
      </div>
    </div>
  );
};

const OpportunityItem = ({ opp, onAction }: { opp: OptimizationOpportunity, onAction: () => void }) => {
  const theme = getTheme(opp.level);
  const Icon = getIcon(opp.type);
  const isClickable = !!opp.guide || !!opp.link;
  return (
    <div onClick={isClickable ? onAction : undefined} className={`p-5 rounded-2xl border ${theme.border} ${theme.bg} flex gap-4 transition-all relative group items-start ${isClickable ? 'hover:shadow-lg cursor-pointer hover:border-indigo-200 hover:bg-white hover:-translate-y-0.5' : ''}`}>
      <div className={`mt-1 flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${theme.iconBg} ${theme.icon} border border-white/50 shadow-sm`}><Icon size={18} /></div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2 mb-1">
          <h4 className={`font-bold text-sm ${theme.text} truncate`}>{opp.title}</h4>
          {opp.potentialGain && (<span className="text-[10px] font-bold bg-white border border-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap shrink-0">+{formatCurrency(opp.potentialGain)}</span>)}
        </div>
        <p className="text-xs text-slate-600 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity line-clamp-2">{opp.message}</p>
      </div>
      {isClickable && <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400"><ArrowRight size={14}/></div>}
    </div>
  );
};

// ============================================================================
// 4. DASHBOARD VIEW
// ============================================================================

function DashboardView() {
  const router = useRouter();
  const { user } = useUser();
  const { profile, isLoaded: isProfileLoaded } = useFinancialData();
  const [selectedGuide, setSelectedGuide] = useState<any | null>(null);
  
  // --- NOUVEL ÉTAT POUR LES ONGLETS ---
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis'>('overview');

  const analysis: DeepAnalysis | null = useMemo(() => {
      if (!profile || !profile.incomes) return null;
      try {
          const budgetContext = computeFinancialPlan(profile);
          return analyzeProfileHealth(profile, budgetContext.budget);
      } catch (e) { console.error(e); return null; }
  }, [profile]);

  const handleAction = (opp: OptimizationOpportunity) => {
      if (opp.guide) setSelectedGuide(opp.guide);
      else if (opp.link) router.push(opp.link);
  };

  if (!isProfileLoaded) return <DashboardSkeleton />;

  if (!analysis || (analysis.ratios.needs === 0 && analysis.opportunities.length === 0)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 animate-fade-in-up">
        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 relative"><div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-20"></div><Target className="text-indigo-600 h-10 w-10 relative z-10" /></div>
        <h2 className="text-3xl font-black text-slate-900 mb-3">Bienvenue, {user?.firstName} !</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-8 text-lg">Pour analyser vos finances, nous avons besoin de vos revenus et charges actuels.</p>
        <Button onClick={() => router.push('/profile')} className="py-4 px-8 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl shadow-lg font-bold text-lg flex items-center gap-2">Configurer mon profil <ArrowRight size={20}/></Button>
      </div>
    );
  }

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
  
  // 🔥 DATA RÉELLE DU MOTEUR
  const simulation = computeFinancialPlan(profile);
  const totalCapacity = simulation.budget.capacityToSave; 
  const autoInvest = simulation.budget.profitableExpenses; 
  const leftCash = simulation.budget.realCashflow; 
  const currentNetWorth = simulation.budget.totalWealth;
  const safetyMonths = simulation.budget.safetyMonths;

  return (
    <>
      <style>{styles}</style>
      <div className="space-y-8 pb-10">
        
        {selectedGuide && <EducationalModal guide={selectedGuide} onClose={() => setSelectedGuide(null)} />}
          
        {/* --- SECTION 1: KPIS (SNAPSHOTS) - TOUJOURS VISIBLES --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
              
              {/* 1. STOCK (PATRIMOINE) */}
              <KpiCard 
                  icon={Layers} 
                  label="Patrimoine Net Actuel" 
                  value={formatCurrency(currentNetWorth)} 
                  subtext="Cash + Investissements Réels"
                  delay="delay-0"
              />
              
              {/* 2. FLUX (DÉTAILLÉ) */}
              <KpiCard 
                  icon={Wallet} 
                  label="Enrichissement Mensuel" 
                  value={formatCurrency(totalCapacity)}
                  trend={`${analysis.ratios.savings}% des revenus`}
                  colorClass={totalCapacity > 0 ? "text-emerald-600" : "text-rose-600"}
                  delay="delay-100"
                  subtext={
                      autoInvest > 0 ? (
                        <div className="pt-3 border-t border-slate-50 w-full">
                            <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                                <span className="text-indigo-600 flex items-center gap-1"><ArrowUpRight size={10}/> Investi</span>
                                <span>{formatCurrency(autoInvest)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600">
                                <span className="flex items-center gap-1"><Wallet size={10}/> Cash</span>
                                <span>+{formatCurrency(leftCash)}</span>
                            </div>
                        </div>
                      ) : (
                        <div className="pt-3 border-t border-slate-50 w-full">
                             <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600">
                                <span className="flex items-center gap-1"><Lock size={10}/> Épargne Disponible</span>
                                <span>100% Cash</span>
                            </div>
                        </div>
                      )
                  }
              />
              
              {/* 3. SÉCURITÉ */}
              <KpiCard 
                  icon={ShieldCheck} 
                  label="Filet de Sécurité" 
                  value={safetyMonths >= 99 ? "Infini" : `${safetyMonths.toFixed(1)} mois`} 
                  subtext="Durée de vie sans revenus"
                  colorClass={safetyMonths < 3 ? "text-rose-600" : "text-indigo-600"}
                  delay="delay-200"
              />
        </div>

        {/* --- SECTION 2: MENU D'ONGLETS (NAVIGATION) --- */}
        <div className="flex justify-center mb-2 animate-fade-in-up delay-100">
            <div className="bg-slate-100 p-1 rounded-xl inline-flex relative shadow-inner">
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Target size={16} /> Tableau de Bord
                </button>
                <button 
                    onClick={() => setActiveTab('analysis')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'analysis' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Activity size={16} /> Analyse de Flux
                </button>
            </div>
        </div>

        {/* --- SECTION 3: CONTENU CONDITIONNEL --- */}
        
        {activeTab === 'overview' ? (
            /* === VUE 1 : ACTIONS & SCORE === */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-fade-in-up">
                {/* ACTIONS */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Rocket className="text-indigo-600"/> Actions Recommandées</h2>
                        <Badge size="sm" className="bg-slate-100 text-slate-500 border-slate-200">{analysis.opportunities.length} détectées</Badge>
                    </div>

                    {heroAction ? (
                        <HeroAction opp={heroAction} onAction={() => handleAction(heroAction)} />
                    ) : (
                        <div className="p-10 text-center bg-emerald-50 rounded-2xl border border-emerald-100">
                            <Crown size={48} className="text-emerald-600 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-emerald-900">Tout est optimisé !</h3>
                            <p className="text-emerald-800/70">Votre santé financière est excellente. Continuez ainsi.</p>
                        </div>
                    )}

                    {secondaryActions.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {secondaryActions.map((opp) => (
                                <OpportunityItem key={opp.id} opp={opp} onAction={() => handleAction(opp)} />
                            ))}
                        </div>
                    )}
                </div>

                {/* SANTÉ & PROJECTIONS */}
                <div className="space-y-6">
                    {/* SCORE */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Stethoscope size={14}/> Score Global</h3>
                            <Badge size="sm" className={`${analysis.globalScore >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{analysis.globalScore >= 80 ? 'Excellent' : 'Moyen'}</Badge>
                        </div>
                        <div className="flex items-center justify-center py-4 relative">
                            <div className="h-40 w-full relative z-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={4}>
                                            {chartData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <RechartsTooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <div className={`text-4xl font-black tracking-tighter ${scoreColor}`}>{analysis.globalScore}</div>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">/ 100</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3 mt-2">
                            <div className="flex justify-between text-sm"><span className="flex items-center gap-2 text-slate-600"><div className="w-2 h-2 rounded-full bg-indigo-500"></div>Besoins (50%)</span><span className="font-bold">{analysis.ratios.needs}%</span></div>
                            <div className="flex justify-between text-sm"><span className="flex items-center gap-2 text-slate-600"><div className="w-2 h-2 rounded-full bg-purple-500"></div>Plaisirs (30%)</span><span className="font-bold">{analysis.ratios.wants}%</span></div>
                            <div className="flex justify-between text-sm"><span className="flex items-center gap-2 text-slate-600"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Épargne (20%)</span><span className="font-bold">{analysis.ratios.savings}%</span></div>
                        </div>
                    </div>

                    {/* PROJECTION */}
                    <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
                        <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-4 flex items-center gap-2"><TrendingUp size={14}/> Projection 10 ans</h3>
                        <div className="flex items-end justify-between mb-2">
                            <div><div className="text-xs text-slate-400">Actuel</div><div className="text-lg font-bold text-white/60">{formatCurrency(currentNetWorth)}</div></div>
                            <div className="text-right"><div className="text-xs text-emerald-400">Futur (est.)</div><div className="text-2xl font-bold text-white">{formatCurrency(analysis.projections.wealth10y)}</div></div>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 mb-4">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (currentNetWorth / (analysis.projections.wealth10y || 1)) * 100)}%` }}></div>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">Projection basée sur une épargne mensuelle de <strong>{formatCurrency(totalCapacity)}</strong> avec un rendement moyen de 7%.</p>
                    </div>
                </div>
            </div>
        ) : (
            /* === VUE 2 : SANKEY (ANALYSE) === */
            <div className="animate-fade-in-up">
                 
                <FinancialSankey />
            </div>
        )}

      </div>
    </>
  );
}

// ============================================================================
// 5. AUTH SCREEN
// ============================================================================

function AuthScreen() {
    const searchParams = useSearchParams();
    const isSignUpMode = searchParams.get('mode') === 'signup';
    const router = useRouter(); 
    const switchToSignIn = () => { router.replace('/?mode=login'); };
    const switchToSignUp = () => { router.replace('/?mode=signup'); };
    
    return (
      <div className="min-h-screen w-full bg-slate-50 flex md:grid md:grid-cols-2">
        <div className="hidden md:flex flex-col justify-between p-12 lg:p-20 bg-slate-900 text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
           <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/3"></div>
           <div className="relative z-10">
             <div className="h-12 w-12 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-8"><TrendingUp size={24} className="text-white"/></div>
             <h1 className="text-4xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-6">{isSignUpMode ? "Votre futur financier commence ici." : "Reprenez le contrôle."}</h1>
             <p className="text-slate-400 text-lg max-w-md leading-relaxed">L'intelligence artificielle qui analyse vos finances, détecte les opportunités cachées et vous guide vers la liberté financière.</p>
           </div>
           <div className="relative z-10 flex gap-4 text-sm font-medium text-slate-500">
               <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-500"/> Chiffré & Sécurisé</div>
               <div className="flex items-center gap-2"><Zap size={16} className="text-amber-500"/> Analyse Instantanée</div>
           </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-white relative">
          <div className="w-full max-w-sm space-y-8 animate-fade-in-up">
              <div className="md:hidden text-center mb-8">
                  <div className="h-12 w-12 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-4"><TrendingUp size={24} className="text-white"/></div>
                  <h1 className="text-2xl font-black text-slate-900">Finance Engine</h1>
              </div>
              {isSignUpMode ? (
                <SignUp key="signup" routing="virtual" appearance={{ baseTheme: clerkAppearanceHybrid, layout: { socialButtonsPlacement: 'bottom' }, elements: { card: "shadow-none p-0", formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20", footerActionLink: "hidden" } }} signInUrl="/?mode=login" afterSignInUrl="/" />
              ) : (
                <SignIn key="login" routing="virtual" appearance={{ baseTheme: clerkAppearanceHybrid, layout: { socialButtonsPlacement: 'bottom' }, elements: { card: "shadow-none p-0", formButtonPrimary: "bg-slate-900 hover:bg-slate-800", footerActionLink: "hidden" } }} signUpUrl="/?mode=signup" afterSignUpUrl="/" />
              )}
              <div className="text-center text-sm">
                  {isSignUpMode ? (<p className="text-slate-500">Déjà un compte ? <button onClick={switchToSignIn} className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline">Se connecter</button></p>) : (<p className="text-slate-500">Pas encore de compte ? <button onClick={switchToSignUp} className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline">Créer un compte</button></p>)}
              </div>
          </div>
        </div>
      </div>
    );
}

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center bg-white"><div className="animate-spin h-8 w-8 border-2 border-slate-200 border-t-indigo-600 rounded-full"></div></div>;
  if (!isSignedIn) return <Suspense fallback={<div className="h-screen w-full bg-white"></div>}><AuthScreen /></Suspense>;
  return <DashboardView />;
}