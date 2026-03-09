'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import Button from '@/app/components/ui/Button';

export interface EmptyListStateProps {
  icon: LucideIcon;
  title?: string;
  message: string;
  buttonLabel: string;
  onAction: () => void;
  variant?: 'full' | 'compact';
}

export default function EmptyListState({
  icon: Icon,
  title = '',
  message,
  buttonLabel,
  onAction,
  variant = 'full',
}: EmptyListStateProps) {
  if (variant === 'compact') {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
        <Icon className="mx-auto text-slate-300 mb-3" size={48} />
        <p className="text-slate-500 font-medium">{message}</p>
        <Button variant="outline" className="mt-4" onClick={onAction}>
          {buttonLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center py-20 opacity-60 bg-white rounded-3xl border border-slate-200 border-dashed">
      <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
        <Icon size={32} className="text-slate-400" />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 max-w-xs mx-auto mb-8">{message}</p>
      <Button onClick={onAction}>{buttonLabel}</Button>
    </div>
  );
}
