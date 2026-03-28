'use client';

import {
  AreaChart,
  Area,
  XAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/app/lib/definitions';

interface WealthChartProps {
  data: { year: string; amount: number }[];
}

export function WealthChart({ data }: WealthChartProps) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorWealthGray" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="year"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            dy={10}
          />
          <RechartsTooltip
            contentStyle={{
              borderRadius: '16px',
              border: 'none',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              padding: '12px',
            }}
            formatter={(val) => [
              <span key="wealth" className="font-bold text-indigo-600">
                {formatCurrency(Number(val))}
              </span>,
              'Patrimoine',
            ]}
            labelStyle={{ display: 'none' }}
            cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#6366f1"
            strokeWidth={3}
            fill="url(#colorWealthGray)"
            animationDuration={400}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
