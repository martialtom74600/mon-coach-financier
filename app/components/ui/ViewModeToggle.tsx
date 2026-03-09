'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface ViewModeOption<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon;
}

export interface ViewModeToggleProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ViewModeOption<T>[];
  className?: string;
}

export default function ViewModeToggle<T extends string>({
  value,
  onChange,
  options,
  className = '',
}: ViewModeToggleProps<T>) {
  return (
    <div className={`bg-white p-1 rounded-xl border border-slate-200 flex gap-1 shadow-sm ${className}`.trim()}>
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
              isSelected ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Icon size={16} /> {opt.label}
          </button>
        );
      })}
    </div>
  );
}
