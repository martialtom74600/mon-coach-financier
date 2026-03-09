'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { formatCurrency } from '@/app/lib/definitions';
import type { GoalProjectionPoint } from '@/app/lib/definitions';

export function ProjectionChart({ data }: { data: GoalProjectionPoint[] }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="h-[200px] w-full mt-4 animate-fade-in">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) =>
              date ? new Date(date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) : ''
            }
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            minTickGap={30}
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
            formatter={(value: number) => [formatCurrency(value), 'Capital']}
            labelFormatter={(label) =>
              label ? new Date(label).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : ''
            }
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorBalance)"
            animationDuration={1500}
          />
          <Area
            type="monotone"
            dataKey="contributed"
            stroke="#64748b"
            strokeDasharray="4 4"
            fill="none"
            strokeWidth={1}
            name="Versements seuls"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
