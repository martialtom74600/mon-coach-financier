'use client';

import React from 'react';
import { ArrowLeft, LucideIcon } from 'lucide-react';

export interface BackLinkProps {
  label: string;
  onClick: () => void;
  variant?: 'emerald' | 'indigo';
  icon?: LucideIcon;
}

export default function BackLink({
  label,
  onClick,
  variant = 'indigo',
  icon: Icon = ArrowLeft,
}: BackLinkProps) {
  const hoverClass = variant === 'emerald' ? 'hover:text-emerald-600' : 'hover:text-indigo-600';

  return (
    <button
      onClick={onClick}
      className={`text-slate-500 flex items-center gap-1 text-sm font-medium transition-colors ${hoverClass}`}
    >
      <Icon size={16} /> {label}
    </button>
  );
}
