import React from 'react';

export interface ProgressBarProps {
  value: number;
  max?: number;
  colorClass?: string;
  className?: string;
}

export default function ProgressBar({ value, max = 100, colorClass = 'bg-indigo-600', className }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div className={`h-2.5 w-full bg-slate-100 rounded-full overflow-hidden ${className || ''}`}>
      <div 
        className={`h-full ${colorClass} transition-all duration-1000 ease-out rounded-full`} 
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
}