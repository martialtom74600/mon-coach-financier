import React from 'react';

const SEMANTIC_COLORS: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
};

export interface BadgeProps {
  children: React.ReactNode;
  /** Token sémantique (indigo, emerald, rose, amber) ou classe Tailwind brute */
  color?: 'indigo' | 'emerald' | 'rose' | 'amber' | string;
  variant?: 'default' | 'secondary' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
}

export default function Badge({ children, color = 'bg-slate-100 text-slate-700', variant, size = 'sm', className = '' }: BadgeProps) {
  const isSemantic = typeof color === 'string' && color in SEMANTIC_COLORS;
  const resolvedColor = isSemantic ? SEMANTIC_COLORS[color] : color;
  
  const variantClass = variant === 'secondary' ? 'bg-slate-100 text-slate-600 border border-slate-200'
    : variant === 'outline' ? 'bg-transparent border border-slate-200 text-slate-600'
    : resolvedColor;
  
  const baseClass = isSemantic
    ? 'rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider border'
    : `rounded font-bold uppercase tracking-wide ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}`;
  
  return (
    <span className={`${baseClass} ${variantClass} ${className}`.trim()}>
      {children}
    </span>
  );
}