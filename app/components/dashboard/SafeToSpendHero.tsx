import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/app/lib/definitions';
import type { TreasurySnapshot } from '@/app/lib/treasuryStatus';

/**
 * Bloc “Disponible sécurisé” rendu côté serveur : même DOM que l’ancien haut de SafeToSpendGauge
 * pour que le LCP (text-6xl) soit dans le HTML initial, pas après hydration React.
 */
export function SafeToSpendHero({
  currentBalance,
  safeToSpend,
  endOfMonthProjection,
}: TreasurySnapshot) {
  const statusColor =
    safeToSpend < 0 ? 'text-rose-600' : safeToSpend < 200 ? 'text-amber-600' : 'text-emerald-600';

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Disponible Sécurisé
            </span>
            <div
              className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-bold cursor-help"
              title="Solde actuel - Charges à venir ce mois-ci"
            >
              ?
            </div>
          </div>
          <div className={`text-6xl font-black tracking-tighter ${statusColor}`}>
            {formatCurrency(safeToSpend)}
          </div>
          <div className="flex items-center gap-2 mt-2">
            {endOfMonthProjection < 0 ? (
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg flex items-center gap-1">
                <AlertTriangle size={12} aria-hidden /> Fin de mois à découvert (
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
    </div>
  );
}
