import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  variant?: 'default' | 'secondary' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
}

export default function Badge({ children, color = 'bg-slate-100 text-slate-700', variant, size = 'sm', className = '' }: BadgeProps) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';
  
  const variantClass = variant === 'secondary' ? 'bg-slate-100 text-slate-600 border border-slate-200'
    : variant === 'outline' ? 'bg-transparent border border-slate-200 text-slate-600'
    : color;
  
  return (
    <span className={`rounded font-bold uppercase tracking-wide ${sizeClass} ${variantClass} ${className}`}>
      {children}
    </span>
  );
}