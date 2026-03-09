'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface QuickActionCardProps {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  color?: 'indigo' | 'emerald';
}

export default function QuickActionCard({
  label,
  icon: Icon,
  onClick,
  color = 'indigo',
}: QuickActionCardProps) {
  const borderHover = color === 'indigo' ? 'hover:border-indigo-200' : 'hover:border-emerald-200';
  const iconBg = color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600';

  return (
    <button
      onClick={onClick}
      className={`group p-4 bg-white border border-slate-100 rounded-[20px] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-3 h-32 text-center ${borderHover}`}
    >
      <div className={`p-3 rounded-full group-hover:scale-110 transition-transform ${iconBg}`}>
        <Icon size={24} />
      </div>
      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{label}</span>
    </button>
  );
}
