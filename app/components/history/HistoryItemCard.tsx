'use client';

import { Trash2, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react';
import Card from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import { formatCurrency } from '@/app/lib/definitions';
import { formatDate } from '@/app/lib/format';
import { getVerdictTheme } from '@/app/lib/themeUtils';

interface HistoryItem {
  id: string;
  name: string;
  amount: number;
  date: string | Date;
  type: string;
  paymentMode: string;
  outcome?: string;
}

interface HistoryItemCardProps {
  item: HistoryItem;
  isDeleting: boolean;
  isUpdating: boolean;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onOutcome: (id: string, outcome: 'SATISFIED' | 'REGRETTED' | null) => void;
}

export function HistoryItemCard({
  item,
  isDeleting,
  isUpdating,
  onDelete,
  onOutcome,
}: HistoryItemCardProps) {
  const outcome = item.outcome;
  const verdict = outcome === 'SATISFIED' ? 'green' : outcome === 'REGRETTED' ? 'red' : 'default';
  const theme = getVerdictTheme(verdict);
  const Icon = theme.icon;

  return (
    <Card
      className={`p-5 flex flex-col sm:flex-row gap-4 sm:items-center transition-all hover:shadow-md border-l-4 ${theme.border.replace('border', 'border-l')} relative group`}
    >
      <button
        onClick={(e) => onDelete(item.id, e)}
        className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 shadow-sm border border-slate-100"
        title="Supprimer"
      >
        {isDeleting ? (
          <div className="animate-spin h-4 w-4 border-2 border-rose-500 border-t-transparent rounded-full"></div>
        ) : (
          <Trash2 size={16} />
        )}
      </button>

      <div className="flex items-center gap-4 sm:w-1/4">
        <div className={`p-3 rounded-xl ${theme.bg} ${theme.text} shrink-0`}>
          <Icon size={24} />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date</span>
          <span className="text-sm font-bold text-slate-700">
            {formatDate(item.date.toString(), 'short')}
          </span>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="font-bold text-slate-800 text-lg mb-1">{item.name}</h3>
        <div className="flex flex-wrap gap-2">
          <Badge color="bg-slate-100 text-slate-600 border border-slate-200">
            {item.type === 'NEED' ? 'Besoin' : item.type === 'OPPORTUNITY' ? 'Utile' : 'Envie'}
          </Badge>
          <Badge color="bg-slate-100 text-slate-600 border border-slate-200">
            {item.paymentMode === 'CASH_SAVINGS'
              ? 'Épargne'
              : item.paymentMode === 'CREDIT'
                ? 'Crédit'
                : 'Compte courant'}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs text-slate-500 font-medium">Tu regrettes ou pas ?</span>
          <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100/80 border border-slate-200/80">
            <button
              onClick={() => onOutcome(item.id, 'SATISFIED')}
              disabled={isUpdating}
              title="J'ai bien fait"
              className={`flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed ${outcome === 'SATISFIED' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-emerald-600'}`}
            >
              <ThumbsUp size={16} strokeWidth={2.5} />
              <span>Oui</span>
            </button>
            <button
              onClick={() => onOutcome(item.id, 'REGRETTED')}
              disabled={isUpdating}
              title="Je regrette"
              className={`flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed ${outcome === 'REGRETTED' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-rose-600'}`}
            >
              <ThumbsDown size={16} strokeWidth={2.5} />
              <span>Non</span>
            </button>
            {outcome && (
              <button
                onClick={() => onOutcome(item.id, null)}
                disabled={isUpdating}
                title="Réinitialiser"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors"
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="text-right flex flex-col items-end gap-1 sm:pr-12">
        <div className="font-black text-slate-900 text-xl tracking-tight">
          {formatCurrency(item.amount)}
        </div>
        <Badge
          color={
            outcome === 'SATISFIED'
              ? 'bg-emerald-100 text-emerald-700'
              : outcome === 'REGRETTED'
                ? 'bg-rose-100 text-rose-700'
                : 'bg-slate-100 text-slate-600'
          }
        >
          {outcome === 'SATISFIED' ? 'Satisfait' : outcome === 'REGRETTED' ? 'Regretté' : 'À évaluer'}
        </Badge>
      </div>
    </Card>
  );
}
