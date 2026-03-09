'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export default function LoadingState({ message = 'Chargement...', className = '' }: LoadingStateProps) {
  return (
    <div className={`bg-white rounded-3xl border border-slate-200 p-12 flex flex-col items-center justify-center text-slate-400 min-h-[400px] ${className}`.trim()}>
      <Loader2 size={32} className="animate-spin mb-3 text-indigo-500" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
