'use client';

import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/app/lib/definitions';
import Tooltip from '@/app/components/ui/Tooltip';

export interface SafeToSpendGaugeProps {
  currentBalance: number;
  upcomingFixed: number;
  upcomingSavings: number;
  safeToSpend: number;
  endOfMonthProjection: number;
}

export function SafeToSpendGauge({
  currentBalance,
  upcomingFixed,
  upcomingSavings,
  safeToSpend,
  endOfMonthProjection,
}: SafeToSpendGaugeProps) {
  const total = Math.max(currentBalance, 1);
  const fixedPct = Math.min((upcomingFixed / total) * 100, 100);
  const safePct = Math.max(0, 100 - fixedPct - (upcomingSavings / total) * 100);
  const savingsPct = Math.min((upcomingSavings / total) * 100, 100 - fixedPct);

  const statusColor =
    safeToSpend < 0 ? 'text-rose-600' : safeToSpend < 200 ? 'text-amber-600' : 'text-emerald-600';
  const barColor =
    safeToSpend < 0 ? 'bg-rose-500' : safeToSpend < 200 ? 'bg-amber-400' : 'bg-emerald-400';

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Disponible Sécurisé
            </span>
            <div className="group relative cursor-help">
              <div className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-bold">
                ?
              </div>
              <Tooltip text="Solde actuel - Charges à venir ce mois-ci" />
            </div>
          </div>
          <div className={`text-6xl font-black tracking-tighter ${statusColor}`}>
            {formatCurrency(safeToSpend)}
          </div>
          <div className="flex items-center gap-2 mt-2">
            {endOfMonthProjection < 0 ? (
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg flex items-center gap-1">
                <AlertTriangle size={12} /> Fin de mois à découvert (
                {formatCurrency(endOfMonthProjection)})
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-400">
                Projection fin de mois :{' '}
                <span className="font-bold text-slate-600">{formatCurrency(endOfMonthProjection)}</span>
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
          <div
            style={{ width: `${fixedPct}%` }}
            className="h-full bg-slate-300 relative group border-r border-white/50"
          >
            <Tooltip text={`Réservé pour factures à venir: ${formatCurrency(upcomingFixed)}`} />
          </div>
          <div
            style={{ width: `${savingsPct}%` }}
            className="h-full bg-indigo-300 relative group border-r border-white/50"
          >
            <Tooltip text={`Réservé pour épargne: ${formatCurrency(upcomingSavings)}`} />
          </div>
          <div style={{ width: `${safePct}%` }} className={`h-full ${barColor} relative group`}>
            <Tooltip text={`Libre pour le plaisir: ${formatCurrency(safeToSpend)}`} />
          </div>
        </div>
        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-300"></div> Réservé (Fixe)
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${barColor}`}></div> Disponible
          </div>
        </div>
      </div>
    </div>
  );
}
