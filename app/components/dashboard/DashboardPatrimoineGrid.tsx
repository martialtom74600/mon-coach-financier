import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp, Target, ShieldCheck } from 'lucide-react';
import type { DeepAnalysis, Profile } from '@/app/lib/definitions';
import { computeFinancialPlan, formatCurrency } from '@/app/lib/logic';
import ChartSkeleton from '@/app/components/ui/ChartSkeleton';
import LazyRender from '@/app/components/ui/LazyRender';
import QuickActionLink from '@/app/components/dashboard/QuickActionLink';

const WealthChart = dynamic(() => import('./WealthChart').then((mod) => mod.WealthChart), {
  ssr: false,
});

function buildWealthChartSeries(profile: Profile): { year: string; amount: number }[] {
  const simulation = computeFinancialPlan(profile);
  const netWorth = simulation.budget.totalWealth;
  const monthlySavings = simulation.budget.capacityToSave;
  const d: { year: string; amount: number }[] = [];
  let wealth = netWorth;
  for (let year = 0; year <= 10; year++) {
    d.push({ year: `+${year}a`, amount: Math.round(wealth) });
    wealth = (wealth + monthlySavings * 12) * 1.05;
  }
  return d;
}

const glassCardClass =
  'bg-white border border-slate-100 shadow-sm rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:border-indigo-100 hover:-translate-y-0.5';

/**
 * Server Component : structure HTML + données ; Recharts isolé dans un Client Component
 * sous Suspense pour l’hydratation sélective (LCP trésorerie au-dessus dans la page).
 */
export default function DashboardPatrimoineGrid({
  profile,
  analysis = null,
}: {
  profile: Profile;
  analysis?: DeepAnalysis | null;
}) {
  const chartData = buildWealthChartSeries(profile);
  const simulation = computeFinancialPlan(profile);
  const netWorth = simulation.budget.totalWealth;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 relative group hover:bg-white hover:shadow-md transition-all duration-500">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600">
                <TrendingUp size={20} aria-hidden />
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Patrimoine Net
                </span>
                <span className="text-2xl font-black text-slate-900">{formatCurrency(netWorth)}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-slate-400 uppercase">Projection 10 ans</div>
              <div className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg inline-block mt-1">
                +5% / an (Simulé)
              </div>
            </div>
          </div>
          <Suspense
            fallback={
              <ChartSkeleton
                heightClass="h-[200px]"
                label="Préparation du graphique"
              />
            }
          >
            <LazyRender
              minHeightClass="min-h-[200px]"
              fallback={
                <ChartSkeleton
                  heightClass="h-[200px]"
                  label="Préparation du graphique"
                />
              }
            >
              <WealthChart data={chartData} />
            </LazyRender>
          </Suspense>
        </div>
      </div>

      <div className="lg:col-span-4 space-y-6">
        <div className={`${glassCardClass} flex items-center gap-5 !p-5`}>
          <div className="h-20 w-20 shrink-0 relative flex items-center justify-center">
            <svg className="transform -rotate-90 w-full h-full drop-shadow-lg" aria-hidden>
              <circle cx="40" cy="40" r="34" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke={
                  analysis
                    ? analysis.globalScore > 60
                      ? '#10b981'
                      : analysis.globalScore > 30
                        ? '#f59e0b'
                        : '#f43f5e'
                    : '#f1f5f9'
                }
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 34}
                strokeDashoffset={(2 * Math.PI * 34) * (1 - (analysis?.globalScore || 0) / 100)}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <span className="absolute text-lg font-black text-slate-800">{analysis?.globalScore || 0}</span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Score Santé</div>
            <div className="text-base font-bold text-slate-700 leading-tight mt-1">
              {analysis
                ? analysis.globalScore > 80
                  ? 'Excellente forme'
                  : analysis.globalScore > 50
                    ? 'Bon état général'
                    : 'Attention requise'
                : 'À calculer'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <QuickActionLink href="/goals" label="Mes Projets" icon={Target} color="indigo" />
          <QuickActionLink href="/profile" label="Mon Profil" icon={ShieldCheck} color="emerald" />
        </div>
      </div>
    </div>
  );
}
