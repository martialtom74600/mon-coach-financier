'use client';

import { formatCurrency } from '@/app/lib/definitions';
import type { TreasurySnapshot } from '@/app/lib/treasuryStatus';
import Tooltip from '@/app/components/ui/Tooltip';

/** Barres + infobulles (client uniquement) — le montant LCP est dans SafeToSpendHero (serveur). */
export function SafeToSpendGaugeBars({
  currentBalance,
  upcomingFixed,
  upcomingSavings,
  safeToSpend,
}: TreasurySnapshot) {
  const total = Math.max(currentBalance, 1);
  const fixedPct = Math.min((upcomingFixed / total) * 100, 100);
  const safePct = Math.max(0, 100 - fixedPct - (upcomingSavings / total) * 100);
  const savingsPct = Math.min((upcomingSavings / total) * 100, 100 - fixedPct);

  const barColor =
    safeToSpend < 0 ? 'bg-rose-500' : safeToSpend < 200 ? 'bg-amber-400' : 'bg-emerald-400';

  return (
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
          <div className="w-2 h-2 rounded-full bg-slate-300" /> Réservé (Fixe)
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${barColor}`} /> Disponible
        </div>
      </div>
    </div>
  );
}
