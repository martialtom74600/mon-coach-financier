'use client';

import dynamic from 'next/dynamic';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Settings,
  Banknote,
  Clock,
  Scissors,
  Shuffle,
  TrendingUp,
} from 'lucide-react';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import BackLink from '@/app/components/ui/BackLink';
import ChartSkeleton from '@/app/components/ui/ChartSkeleton';
import { formatCurrency } from '@/app/lib/definitions';
import type { GoalStrategy, GoalScenarioResult } from '@/app/lib/definitions';
import type { GoalFormData } from './GoalForm';

const ProjectionChart = dynamic(
  () => import('./GoalProjectionChart').then((m) => m.ProjectionChart),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-[200px]" className="mt-4" /> }
);

const StrategyIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'TIME':
      return <Clock size={18} />;
    case 'BUDGET':
      return <Scissors size={18} />;
    case 'HYBRID':
      return <Shuffle size={18} />;
    case 'INCOME':
      return <TrendingUp size={18} />;
    default:
      return <Settings size={18} />;
  }
};

interface GoalSimulationProps {
  simulation: GoalScenarioResult;
  formData: GoalFormData;
  setFormData: React.Dispatch<React.SetStateAction<GoalFormData>>;
  onApplyStrategy: (strategy: GoalStrategy) => void;
  onSave: () => void;
  onBack: () => void;
  isSaving: boolean;
}

export function GoalSimulation({
  simulation,
  formData,
  setFormData,
  onApplyStrategy,
  onSave,
  onBack,
  isSaving,
}: GoalSimulationProps) {
  const statusBg =
    simulation.diagnosis.status === 'POSSIBLE' || simulation.diagnosis.status === 'DONE'
      ? 'bg-emerald-600'
      : simulation.diagnosis.status === 'HARD'
        ? 'bg-amber-500'
        : 'bg-slate-800';

  const StatusIcon =
    simulation.diagnosis.status === 'POSSIBLE' || simulation.diagnosis.status === 'DONE'
      ? CheckCircle
      : simulation.diagnosis.status === 'HARD'
        ? AlertTriangle
        : XCircle;

  return (
    <div className="animate-fade-in space-y-6">
      <BackLink
        label="Modifier"
        onClick={onBack}
        variant="emerald"
      />

      <Card className="overflow-hidden p-0 border-0 shadow-xl">
        <div className={`${statusBg} p-6 text-white relative overflow-hidden transition-colors duration-500`}>
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
              <StatusIcon size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{simulation.diagnosis.label}</h2>
              <p className="text-white/90 text-sm mt-1">{simulation.diagnosis.mainMessage}</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 gap-4">
            <div>
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                Effort mensuel requis
              </div>
              <div className="text-2xl font-black text-slate-800">
                {formatCurrency(simulation.monthlyEffort)}{' '}
                <span className="text-sm font-medium text-slate-400">/ mois</span>
              </div>
            </div>
            <div className="hidden sm:block h-10 w-px bg-slate-200"></div>
            <div>
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                Capital Final Estimé
              </div>
              <div className="text-2xl font-black text-emerald-600">
                {formatCurrency(simulation.projectionData.summary.finalAmount)}
              </div>
              {simulation.projectionData.summary.totalInterests > 0 && (
                <div className="text-xs text-emerald-600 font-medium">
                  Dont {formatCurrency(simulation.projectionData.summary.totalInterests)} d&apos;intérêts
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
              Trajectoire prévue
            </h3>
            <ProjectionChart data={simulation.projectionData.projection} />
          </div>

          {simulation.diagnosis.strategies.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Settings size={14} /> Stratégies pour optimiser :
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {simulation.diagnosis.strategies.map((strat: GoalStrategy, i: number) => (
                  <div
                    key={i}
                    className={`flex flex-col p-4 border rounded-xl transition-colors relative overflow-hidden ${strat.painLevel === 'HIGH' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-200 hover:border-indigo-200'}`}
                  >
                    <div className="flex items-center gap-2 mb-2 font-bold text-slate-800">
                      <div className="p-1.5 bg-white rounded-lg text-indigo-600 shadow-sm border border-slate-100">
                        <StrategyIcon type={strat.type} />
                      </div>
                      {strat.title}
                    </div>
                    <p className="text-xs text-slate-600 mb-4 flex-1 leading-relaxed">{strat.message}</p>
                    {strat.actionLabel && !strat.disabled && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onApplyStrategy(strat)}
                        className="w-full bg-white border-slate-200 shadow-sm hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
                      >
                        {strat.actionLabel || 'Appliquer'}
                      </Button>
                    )}
                    {strat.type === 'TIME' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onApplyStrategy(strat)}
                        className="w-full bg-white border-slate-200 shadow-sm hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
                      >
                        Ajuster la date
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            <h3 className="text-indigo-900 font-bold flex items-center gap-2 mb-2">
              <Banknote size={18} /> Automatisation
            </h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <label className="text-sm font-bold text-indigo-900 whitespace-nowrap">
                Jour du virement :
              </label>
              <select
                className="p-2 bg-white border border-indigo-200 rounded-lg text-indigo-900 font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                value={formData.transferDay || ''}
                onChange={(e) => setFormData({ ...formData, transferDay: e.target.value })}
              >
                <option value="">Choisir...</option>
                {[...Array(28)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Le {i + 1} du mois
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={onSave}
              disabled={isSaving}
              className={`w-full text-lg h-12 shadow-xl ${simulation.diagnosis.status !== 'IMPOSSIBLE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-800 hover:bg-slate-900'}`}
            >
              {isSaving ? 'Création...' : simulation.diagnosis.status !== 'IMPOSSIBLE' ? "Valider et créer l'objectif" : 'Forcer la création'}
            </Button>
            {simulation.diagnosis.status === 'IMPOSSIBLE' && (
              <p className="text-center text-xs text-slate-400 mt-2">
                Attention : ton budget passerait en négatif.
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
