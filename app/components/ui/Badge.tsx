import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color?: string; // ex: "bg-emerald-100 text-emerald-700"
  size?: 'sm' | 'md';
}

export default function Badge({ children, color = 'bg-slate-100 text-slate-700', size = 'sm' }: BadgeProps) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';
  
  return (
    <span className={`rounded font-bold uppercase tracking-wide ${sizeClass} ${color}`}>
      {children}
    </span>
  );
}