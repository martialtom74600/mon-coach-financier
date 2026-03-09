'use client';

import { TrendingDown, CheckCircle, XCircle } from 'lucide-react';
import Card from '@/app/components/ui/Card';
import ProgressBar from '@/app/components/ui/ProgressBar';
import { formatCurrency } from '@/app/lib/definitions';

interface HistoryStatsProps {
  total: number;
  accepted: number;
  rejected: number;
  amountTotal: number;
}

export function HistoryStats({ total, accepted, rejected, amountTotal }: HistoryStatsProps) {
  return (
    <Card className="p-6 border-indigo-100 bg-indigo-50/30">
      <h3 className="font-bold text-indigo-900 mb-6 flex items-center gap-2 text-lg">
        <TrendingDown size={20} /> Résumé Global
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-50">
          <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Projets</div>
          <div className="text-3xl font-black text-slate-800">{total}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-50">
          <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Volume Cumulé</div>
          <div className="text-xl font-black text-indigo-600 break-words">{formatCurrency(amountTotal)}</div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle size={14} /> Feux verts
            </span>
            <span className="font-bold text-slate-700">
              {accepted} <span className="text-slate-400 font-normal">/ {total}</span>
            </span>
          </div>
          <ProgressBar value={accepted} max={total || 1} colorClass="bg-emerald-500" />
        </div>

        {rejected > 0 && (
          <div className="pt-4 border-t border-indigo-100">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-rose-700 font-bold flex items-center gap-1">
                <XCircle size={14} /> Projets risqués
              </span>
              <span className="font-bold text-rose-600">{rejected}</span>
            </div>
            <ProgressBar value={rejected} max={total || 1} colorClass="bg-rose-500" />
            <p className="text-xs text-slate-500 mt-2 italic">
              Ces achats ont été marqués comme regrettés.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
