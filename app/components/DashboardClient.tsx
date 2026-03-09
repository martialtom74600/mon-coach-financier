'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Profile } from '@/app/lib/definitions';
import { computeFinancialPlan, formatCurrency } from '@/app/lib/logic';
import { generateTimeline } from '@/app/lib/scenarios';
import { TrendingUp, Target, ShieldCheck, Zap } from 'lucide-react';
import { SafeToSpendGauge } from '@/app/components/dashboard/SafeToSpendGauge';
import { WealthChart } from '@/app/components/dashboard/WealthChart';
import { EducationalModal } from '@/app/components/dashboard/EducationalModal';
import ProactiveInsightsCard, { type StoredInsight } from '@/app/components/dashboard/ProactiveInsightsCard';
import GlassCard from '@/app/components/ui/GlassCard';
import ProfileEmptyPrompt from '@/app/components/ui/ProfileEmptyPrompt';
import QuickActionCard from '@/app/components/ui/QuickActionCard';
import type { ActionGuide, DeepAnalysis } from '@/app/lib/definitions';

interface DashboardClientProps {
  profile: Profile | null;
  firstName?: string | null;
  initialInsights?: StoredInsight[];
  analysis?: DeepAnalysis | null;
}

export default function DashboardClient({ profile, firstName, initialInsights = [], analysis = null }: DashboardClientProps) {
  const router = useRouter();
  const [selectedGuide, setSelectedGuide] = useState<ActionGuide | null>(null);
  const [insights, setInsights] = useState<StoredInsight[]>(initialInsights);

  useEffect(() => {
    setInsights(initialInsights);
  }, [initialInsights]);

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
      <ProfileEmptyPrompt
        variant="full"
        title={`Bonjour, ${firstName || ''}.`}
        message="Pour construire votre GPS financier, nous devons d'abord comprendre votre point de départ."
        buttonLabel="Lancer l'analyse"
        onAction={() => router.push('/profile')}
        icon={Zap}
      />
    );
  }

  const isProfileEmpty = (
      (!profile.incomes || profile.incomes.length === 0) && 
      (!profile.assets || profile.assets.length === 0) && 
      (profile.currentBalance === 0 || profile.currentBalance === undefined)
  );

  if (isProfileEmpty) {
    return (
      <ProfileEmptyPrompt
        variant="full"
        title={`Bonjour, ${profile.firstName || firstName || ''}.`}
        message="Pour construire votre GPS financier, nous devons d'abord comprendre votre point de départ."
        buttonLabel="Lancer l'analyse"
        onAction={() => router.push('/profile')}
        icon={Zap}
      />
    );
  }

  const simulation = computeFinancialPlan(profile);
  const netWorth = simulation.budget.totalWealth;

  return (
    <>
        {selectedGuide && <EducationalModal guide={selectedGuide} onClose={() => setSelectedGuide(null)} />}

        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">

            {insights.length > 0 && (
                <ProactiveInsightsCard
                  insights={insights}
                  onDismiss={(id) => setInsights((prev) => prev.filter((i) => i.id !== id))}
                  onOpenGuide={(guide) => setSelectedGuide(guide)}
                />
            )}

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
                        <WealthChart data={chartData} />
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
                         <QuickActionCard
                           label="Mes Projets"
                           icon={Target}
                           onClick={() => router.push('/goals')}
                           color="indigo"
                         />
                         <QuickActionCard
                           label="Mon Profil"
                           icon={ShieldCheck}
                           onClick={() => router.push('/profile')}
                           color="emerald"
                         />
                    </div>
                </div>
            </div>
        </div>
    </>
  );
}
