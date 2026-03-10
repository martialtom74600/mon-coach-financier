'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface EmptyStateProps {
  message?: string;
  className?: string;
}

export default function EmptyState({ message = 'Rien pour l\'instant.', className = '' }: EmptyStateProps) {
  return (
    <div className={`bg-white rounded-3xl border border-slate-200 p-12 flex flex-col items-center justify-center text-slate-400 min-h-[400px] ${className}`.trim()}>
      <AlertCircle size={32} className="mb-3 text-slate-300" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
