'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';

const VARIANT_STYLES = {
  emerald: {
    container: 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200',
    icon: 'bg-emerald-100 text-emerald-600',
    label: 'text-emerald-900',
    checkbox: 'bg-emerald-600 border-emerald-600',
  },
  indigo: {
    container: 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200',
    icon: 'bg-indigo-100 text-indigo-600',
    label: 'text-indigo-900',
    checkbox: 'bg-indigo-600 border-indigo-600',
  },
};

export interface ContextToggleProps {
  label: string;
  subLabel: string;
  icon: React.ComponentType<{ size?: number | string }>;
  checked: boolean;
  onChange: (checked: boolean) => void;
  variant?: 'emerald' | 'indigo';
  disabled?: boolean;
}

export default function ContextToggle({
  label,
  subLabel,
  icon: Icon,
  checked,
  onChange,
  variant = 'indigo',
  disabled = false,
}: ContextToggleProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <label
      className={`flex items-center gap-4 p-4 border rounded-xl transition-all duration-200 ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      } ${checked ? styles.container : 'bg-white border-slate-200 hover:bg-slate-50'}`}
    >
      <div
        className={`p-2 rounded-lg ${checked ? styles.icon : 'bg-slate-100 text-slate-400'}`}
      >
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <div className={`font-bold text-sm ${checked ? styles.label : 'text-slate-700'}`}>{label}</div>
        <div className="text-xs text-slate-500 mt-0.5">{subLabel}</div>
      </div>
      <div
        className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${checked ? styles.checkbox : 'bg-white border-slate-300'}`}
      >
        {checked && <CheckCircle size={14} className="text-white" />}
      </div>
      <input
        type="checkbox"
        className="hidden"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
