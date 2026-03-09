'use client';

import React from 'react';
import { Info } from 'lucide-react';

export interface InfoBoxProps {
  children: React.ReactNode;
  className?: string;
}

export default function InfoBox({ children, className = 'mb-6' }: InfoBoxProps) {
  return (
    <div className={`bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex gap-3 text-xs text-indigo-800 ${className}`}>
      <Info size={16} className="shrink-0 mt-0.5 text-indigo-500" />
      <div className="leading-relaxed opacity-90 font-medium">{children}</div>
    </div>
  );
}
