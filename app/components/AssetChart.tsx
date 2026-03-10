'use client';

import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/app/lib/definitions';
import { formatDate } from '@/app/lib/format';
import { TrendingUp, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface AssetHistoryPoint {
  id: string;
  value: number;
  date: string;
}

interface AssetChartProps {
  assetId: string;
  assetName: string;
  className?: string;
}

export default function AssetChart({ assetId, assetName, className = '' }: AssetChartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [data, setData] = useState<AssetHistoryPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isExpanded || !assetId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/assets/${assetId}/history`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) throw new Error('Accès refusé');
          if (res.status === 403) throw new Error('Accès refusé');
          throw new Error('Oups, ça n\'a pas chargé. Réessaie ?');
        }
        return res.json();
      })
      .then((raw: AssetHistoryPoint[]) => {
        if (!Array.isArray(raw)) {
          setData([]);
          return;
        }
        setData(
          raw.map((p) => ({
            id: p.id,
            value: typeof p.value === 'number' ? p.value : Number(p.value) || 0,
            date: p.date,
          }))
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Oups'))
      .finally(() => setLoading(false));
  }, [assetId, isExpanded]);

  const chartData =
    data?.map((p) => ({
      ...p,
      label: formatDate(p.date, 'short'),
    })) ?? [];

  const canShowChart = chartData.length >= 2;
  const singlePoint = chartData.length === 1;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors py-1"
      >
        <TrendingUp size={14} />
        {isExpanded ? 'Masquer l\'évolution' : 'Voir l\'évolution'}
        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isExpanded && (
        <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
          {loading && (
            <div className="h-[120px] flex items-center justify-center">
              <Loader2 className="animate-spin text-indigo-500" size={24} />
            </div>
          )}
          {error && (
            <p className="text-sm text-rose-600 py-4 text-center">
              {error === 'Accès refusé'
                ? 'Sauvegarde d\'abord cet actif pour voir son évolution.'
                : error}
            </p>
          )}
          {!loading && !error && singlePoint && (
            <p className="text-sm text-slate-500 py-4 text-center">
              Un seul point enregistré. Modifie la valeur et sauvegarde pour tracer l&apos;évolution.
            </p>
          )}
          {!loading && !error && chartData.length === 0 && !singlePoint && (
            <p className="text-sm text-slate-500 py-4 text-center">
              Aucun historique. Modifie la valeur et sauvegarde pour commencer à tracer.
            </p>
          )}
          {!loading && !error && canShowChart && (
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`colorAsset-${assetId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      padding: '8px 12px',
                    }}
                    formatter={(val: number) => [
                      <span key="val" className="font-bold text-indigo-600">
                        {formatCurrency(val)}
                      </span>,
                      assetName,
                    ]}
                    labelStyle={{ display: 'none' }}
                    cursor={{ stroke: '#6366f1', strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill={`url(#colorAsset-${assetId})`}
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
