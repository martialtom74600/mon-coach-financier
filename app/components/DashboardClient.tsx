'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  AreaChart, Area, XAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';

import { Profile } from '@/app/lib/definitions';
import { 
  computeFinancialPlan, 
  analyzeProfileHealth, 
  DeepAnalysis,
  OptimizationOpportunity,
  ActionGuide,
  formatCurrency
} from '@/app/lib/logic';
import { generateTimeline } from '@/app/lib/scenarios';

import {
  TrendingUp, ArrowRight, Target,
  ShieldCheck, Zap, Crown,
  X, BookOpen, CheckSquare, Lightbulb, AlertTriangle
} from 'lucide-react';

// ============================================================================
// 0. UI MICRO-COMPONENTS
// ============================================================================

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const GlassCard = ({ children, className = "", onClick }: GlassCardProps) => (
  <div onClick={onClick} className={`bg-white border border-slate-100 shadow-sm rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:border-indigo-100 hover:-translate-y-0.5 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, color = "indigo" }: { children: React.ReactNode, color?: "indigo"|"emerald"|"rose"|"amber" }) => {
    const colors = {
        indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
        emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
        rose: "bg-rose-50 text-rose-700 border-rose-100",
        amber: "bg-amber-50 text-amber-700 border-amber-100",
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${colors[color]}`}>
            {children}
        </span>
    );
};

const SimpleTooltip = ({ text }: { text: string }) => (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:translate-y-0 translate-y-1 whitespace-nowrap pointer-events-none z-20 shadow-xl">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
    </div>
);

// ============================================================================
// 1. BUSINESS COMPONENTS
// ============================================================================

interface SafeToSpendGaugeProps {
  currentBalance: number;
  upcomingFixed: number;
  upcomingSavings: number;
  safeToSpend: number;
  endOfMonthProjection: number;
}

const SafeToSpendGauge = ({ currentBalance, upcomingFixed, upcomingSavings, safeToSpend, endOfMonthProjection }: SafeToSpendGaugeProps) => {
    const total = Math.max(currentBalance, 1); 
    const fixedPct = Math.min((upcomingFixed / total) * 100, 100);
    const safePct = Math.max(0, 100 - fixedPct - ((upcomingSavings / total) * 100));
    const savingsPct = Math.min((upcomingSavings / total) * 100, 100 - fixedPct);

    const statusColor = safeToSpend < 0 ? 'text-rose-600' : (safeToSpend < 200 ? 'text-amber-600' : 'text-emerald-600');
    const barColor = safeToSpend < 0 ? 'bg-rose-500' : (safeToSpend < 200 ? 'bg-amber-400' : 'bg-emerald-400');

    return (
        <div className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Disponible Sécurisé</span>
                        <div className="group relative cursor-help">
                            <div className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-bold">?</div>
                            <SimpleTooltip text="Solde actuel - Charges à venir ce mois-ci" />
                        </div>
                    </div>
                    <div className={`text-6xl font-black tracking-tighter ${statusColor}`}>
                        {formatCurrency(safeToSpend)}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        {endOfMonthProjection < 0 ? (
                            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg flex items-center gap-1">
                                <AlertTriangle size={12}/> Fin de mois à découvert ({formatCurrency(endOfMonthProjection)})
                            </span>
                        ) : (
                            <span className="text-xs font-medium text-slate-400">
                                Projection fin de mois : <span className="font-bold text-slate-600">{formatCurrency(endOfMonthProjection)}</span>
                            </span>
                        )}
                    </div>
                </div>
                <div className="text-right p-3 bg-slate-50 rounded-xl border border-slate-100 min-w-[140px]">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Solde Banque (J)</div>
                    <div className="font-black text-slate-900 text-xl">{formatCurrency(currentBalance)}</div>
                </div>
            </div>
            <div className="space-y-2">
                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex relative">
                    <div style={{ width: `${fixedPct}%` }} className="h-full bg-slate-300 relative group border-r border-white/50">
                         <SimpleTooltip text={`Réservé pour factures à venir: ${formatCurrency(upcomingFixed)}`} />
                    </div>
                    <div style={{ width: `${savingsPct}%` }} className="h-full bg-indigo-300 relative group border-r border-white/50">
                         <SimpleTooltip text={`Réservé pour épargne: ${formatCurrency(upcomingSavings)}`} />
                    </div>
                    <div style={{ width: `${safePct}%` }} className={`h-full ${barColor} relative group`}>
                         <SimpleTooltip text={`Libre pour le plaisir: ${formatCurrency(safeToSpend)}`} />
                    </div>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-300"></div> Réservé (Fixe)</div>
                    <div className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${barColor}`}></div> Disponible</div>
                </div>
            </div>
        </div>
    );
};

const EducationalModal = ({ guide, onClose }: { guide: ActionGuide | null, onClose: () => void }) => {
    if (!guide) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 duration-300 scale-100" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-900 p-8 text-white relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="relative z-10 flex gap-5">
                        <div className="p-3.5 bg-white/10 rounded-2xl backdrop-blur-md shrink-0 border border-white/10 shadow-inner">
                            <BookOpen size={28} className="text-indigo-300" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold leading-tight mb-2">{guide.title}</h3>
                            <p className="text-slate-300 text-sm leading-relaxed max-w-sm">{guide.definition}</p>
                            <div className="flex gap-2 mt-4">
                                {guide.difficulty && <Badge color="indigo">{guide.difficulty}</Badge>}
                                {guide.impact && <Badge color="emerald">{guide.impact}</Badge>}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/10">
                        <X size={24} />
                    </button>
                </div>
                <div className="overflow-y-auto custom-scrollbar p-8 space-y-8 bg-slate-50/50">
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <CheckSquare size={16} className="text-indigo-600" /> Plan d&apos;action
                        </h4>
                        <div className="space-y-3">
                            {guide.steps?.map((step: string, i: number) => (
                                <div key={i} className="flex gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm group hover:border-indigo-100 transition-colors">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-xs border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        {i + 1}
                                    </span>
                                    <span className="text-sm text-slate-700 font-medium leading-relaxed pt-0.5">{step}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {guide.tips && guide.tips.length > 0 && (
                        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 shadow-sm">
                            <h4 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Lightbulb size={16} /> Le Conseil Pro
                            </h4>
                            <ul className="space-y-3">
                                {guide.tips.map((tip: string, i: number) => (
                                    <li key={i} className="flex gap-3 text-sm text-slate-700">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="p-5 border-t border-slate-100 bg-white flex justify-end shrink-0">
                    <button onClick={onClose} className="px-8 py-3.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                        C&apos;est noté, je m&apos;y mets
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// 2. DASHBOARD CLIENT (Server-fed profile)
// ============================================================================

interface DashboardClientProps {
  profile: Profile | null;
  firstName?: string | null;
}

export default function DashboardClient({ profile, firstName }: DashboardClientProps) {
  const router = useRouter();
  const [selectedGuide, setSelectedGuide] = useState<ActionGuide | null>(null);

  const analysis: DeepAnalysis | null = useMemo(() => {
      if (!profile) return null; 
      try {
          const budgetContext = computeFinancialPlan(profile);
          return analyzeProfileHealth(profile, budgetContext.budget);
      } catch (e) { console.error("Erreur analyse", e); return null; }
  }, [profile]);

  const handleActionClick = (opp: OptimizationOpportunity) => {
      if (opp.guide) setSelectedGuide(opp.guide);
      else if (opp.link) {
          if (opp.link.startsWith('http')) window.open(opp.link, '_blank');
          else router.push(opp.link);
      } else router.push('/profile');
  };

  const treasuryStatus = useMemo(() => {
      if (!profile) return null;

      const timeline = generateTimeline(profile, profile.decisions || [], [], 45);
      const currentMonthKey = new Date().toISOString().slice(0, 7);
      const monthData = timeline.find(m => m.id === currentMonthKey);
      
      if (!monthData) return {
          currentBalance: profile.currentBalance || 0,
          upcomingFixed: 0,
          upcomingSavings: 0,
          safeToSpend: profile.currentBalance || 0,
          endOfMonthProjection: profile.currentBalance || 0
      };

      const todayDate = new Date().toISOString().slice(0, 10);
      const todayData = monthData.days.find(d => d.date.startsWith(todayDate));
      const currentBalance = todayData?.balance ?? (profile.currentBalance || 0);

      const todayIndex = monthData.days.findIndex(d => d.date.startsWith(todayDate));
      const remainingDays = todayIndex >= 0 ? monthData.days.slice(todayIndex + 1) : monthData.days;
      
      let upcomingFixed = 0;
      let upcomingSavings = 0;

      remainingDays.forEach(day => {
          day.events.forEach(evt => {
              if (evt.amount < 0) {
                  if (evt.name.toLowerCase().includes('épargne') || evt.name.toLowerCase().includes('virement')) {
                      upcomingSavings += Math.abs(evt.amount);
                  } else {
                      upcomingFixed += Math.abs(evt.amount);
                  }
              }
          });
      });

      const safeToSpend = currentBalance - upcomingFixed - upcomingSavings;
      const endOfMonthProjection = monthData.stats.balanceEnd;

      return {
          currentBalance,
          upcomingFixed,
          upcomingSavings,
          safeToSpend,
          endOfMonthProjection
      };
  }, [profile]);

  const chartData = useMemo(() => {
      if (!profile) return [];
      const simulation = computeFinancialPlan(profile);
      const netWorth = simulation.budget.totalWealth;
      const monthlySavings = simulation.budget.capacityToSave;
      const d = [];
      let wealth = netWorth;
      for (let year = 0; year <= 10; year++) {
          d.push({ year: `+${year}a`, amount: Math.round(wealth) });
          wealth = (wealth + (monthlySavings * 12)) * 1.05;
      }
      return d;
  }, [profile]);

  // Profil null = utilisateur pas encore en BDD (premier login)
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center bg-white p-8 text-center rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 min-h-[60vh] max-w-2xl mx-auto mt-10">
        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <Zap className="text-indigo-600 h-10 w-10" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Bonjour, {firstName || ''}.</h1>
        <p className="text-slate-500 text-lg max-w-md mb-8 leading-relaxed">Pour construire votre GPS financier, nous devons d&apos;abord comprendre votre point de départ.</p>
        <button onClick={() => router.push('/profile')} className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-xl hover:shadow-2xl hover:bg-indigo-600 flex items-center gap-2">
            Lancer l&apos;analyse <ArrowRight size={20}/>
        </button>
      </div>
    );
  }

  const isProfileEmpty = (
      (!profile.incomes || profile.incomes.length === 0) && 
      (!profile.assets || profile.assets.length === 0) && 
      (profile.currentBalance === 0 || profile.currentBalance === undefined)
  );

  if (isProfileEmpty) {
    return (
      <div className="flex flex-col items-center justify-center bg-white p-8 text-center rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 min-h-[60vh] max-w-2xl mx-auto mt-10">
        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <Zap className="text-indigo-600 h-10 w-10" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Bonjour, {profile.firstName || firstName || ''}.</h1>
        <p className="text-slate-500 text-lg max-w-md mb-8 leading-relaxed">Pour construire votre GPS financier, nous devons d&apos;abord comprendre votre point de départ.</p>
        <button onClick={() => router.push('/profile')} className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-xl hover:shadow-2xl hover:bg-indigo-600 flex items-center gap-2">
            Lancer l&apos;analyse <ArrowRight size={20}/>
        </button>
      </div>
    );
  }

  const simulation = computeFinancialPlan(profile);
  const netWorth = simulation.budget.totalWealth;
  const heroAction = analysis?.opportunities?.[0];
  const otherActions = analysis?.opportunities?.slice(1, 4) || [];

  return (
    <>
        {selectedGuide && <EducationalModal guide={selectedGuide} onClose={() => setSelectedGuide(null)} />}

        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">

            {treasuryStatus && (
                <GlassCard className="border-indigo-50/50 shadow-xl shadow-indigo-100/40 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                    <div className="relative z-10">
                        <SafeToSpendGauge 
                            currentBalance={treasuryStatus.currentBalance}
                            upcomingFixed={treasuryStatus.upcomingFixed}
                            upcomingSavings={treasuryStatus.upcomingSavings}
                            safeToSpend={treasuryStatus.safeToSpend}
                            endOfMonthProjection={treasuryStatus.endOfMonthProjection}
                        />
                    </div>
                </GlassCard>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                <div className="lg:col-span-8 space-y-6">
                    
                    {heroAction ? (
                        <div 
                            className="bg-white border border-slate-100 rounded-3xl p-6 flex flex-col sm:flex-row items-start gap-5 cursor-pointer hover:border-indigo-200 hover:shadow-lg transition-all group relative overflow-hidden"
                            onClick={() => handleActionClick(heroAction)}
                        >
                             <div className={`absolute left-0 top-0 bottom-0 w-1 ${heroAction.level === 'CRITICAL' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                             <div className={`p-4 rounded-2xl shrink-0 ${heroAction.level === 'CRITICAL' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                                <Zap size={28} />
                             </div>
                             <div className="flex-1 relative z-10 w-full">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-900 text-lg">Conseil Prioritaire</h3>
                                        <Badge color={heroAction.level === 'CRITICAL' ? 'rose' : 'amber'}>Important</Badge>
                                    </div>
                                    <span className="text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform flex items-center gap-1 bg-indigo-50 px-3 py-1 rounded-full">
                                        {heroAction.guide ? "Lire le guide" : "Agir"} <ArrowRight size={14}/>
                                    </span>
                                </div>
                                <h4 className="font-bold text-base text-slate-800 mb-1">{heroAction.title}</h4>
                                <p className="text-sm text-slate-500 leading-relaxed">{heroAction.message}</p>
                            </div>
                        </div>
                    ) : (
                         <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-6 flex items-center gap-5">
                            <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl"><Crown size={28}/></div>
                            <div>
                                <h3 className="font-bold text-emerald-900 text-lg">Tout est optimisé</h3>
                                <p className="text-sm text-emerald-700">Votre situation est saine. Aucune action requise pour le moment.</p>
                            </div>
                         </div>
                    )}

                    <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 relative group hover:bg-white hover:shadow-md transition-all duration-500">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600"><TrendingUp size={20}/></div>
                                <div>
                                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Patrimoine Net</span>
                                    <span className="text-2xl font-black text-slate-900">{formatCurrency(netWorth)}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-bold text-slate-400 uppercase">Projection 10 ans</div>
                                <div className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg inline-block mt-1">+5% / an (Simulé)</div>
                            </div>
                        </div>
                        
                        <div className="h-[200px] w-full">
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorWealthGray" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
                                    <RechartsTooltip 
                                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px'}}
                                        formatter={(val) => [<span key="wealth" className="font-bold text-indigo-600">{formatCurrency(Number(val))}</span>, "Patrimoine"]}
                                        labelStyle={{display:'none'}}
                                        cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                                    />
                                    <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fill="url(#colorWealthGray)" animationDuration={1500} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>

                <div className="lg:col-span-4 space-y-6">
                    <GlassCard className="flex items-center gap-5 !p-5">
                         <div className="h-20 w-20 shrink-0 relative flex items-center justify-center">
                            <svg className="transform -rotate-90 w-full h-full drop-shadow-lg">
                                <circle cx="40" cy="40" r="34" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                                <circle cx="40" cy="40" r="34" stroke={analysis ? (analysis.globalScore > 60 ? "#10b981" : (analysis.globalScore > 30 ? "#f59e0b" : "#f43f5e")) : "#f1f5f9"} strokeWidth="8" fill="transparent" strokeDasharray={2 * Math.PI * 34} strokeDashoffset={(2 * Math.PI * 34) * (1 - (analysis?.globalScore || 0)/100)} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                            </svg>
                            <span className="absolute text-lg font-black text-slate-800">{analysis?.globalScore || 0}</span>
                         </div>
                         <div>
                             <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Score Santé</div>
                             <div className="text-base font-bold text-slate-700 leading-tight mt-1">
                                {analysis ? (analysis.globalScore > 80 ? "Excellente forme" : (analysis.globalScore > 50 ? "Bon état général" : "Attention requise")) : "À calculer"}
                             </div>
                         </div>
                    </GlassCard>

                    <div className="grid grid-cols-2 gap-4">
                         <button onClick={() => router.push('/goals')} className="group p-4 bg-white border border-slate-100 rounded-[20px] shadow-sm hover:border-indigo-200 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-3 h-32 text-center">
                             <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full group-hover:scale-110 transition-transform"><Target size={24} /></div>
                             <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Mes Projets</span>
                         </button>
                         <button onClick={() => router.push('/profile')} className="group p-4 bg-white border border-slate-100 rounded-[20px] shadow-sm hover:border-emerald-200 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-3 h-32 text-center">
                             <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full group-hover:scale-110 transition-transform"><ShieldCheck size={24} /></div>
                             <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Mon Profil</span>
                         </button>
                    </div>

                    {otherActions.length > 0 && (
                        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">À faire aussi</h4>
                             <div className="space-y-4">
                                {otherActions.map(opp => (
                                    <div key={opp.id} className="flex items-start gap-3 cursor-pointer group p-2 hover:bg-slate-50 rounded-xl transition-colors -mx-2" onClick={() => handleActionClick(opp)}>
                                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 transition-colors ${opp.level === 'WARNING' ? 'bg-amber-400' : 'bg-slate-300 group-hover:bg-indigo-500'}`}></div>
                                        <div>
                                            <span className="text-sm font-bold text-slate-700 block group-hover:text-indigo-700 transition-colors">{opp.title}</span>
                                            <span className="text-xs text-slate-400 line-clamp-1">{opp.message}</span>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </>
  );
}
