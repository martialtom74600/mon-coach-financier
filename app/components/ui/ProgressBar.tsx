import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  colorClass?: string; // ex: "bg-emerald-500"
}

export default function ProgressBar({ value, max, colorClass = 'bg-indigo-600' }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <div 
        className={`h-full ${colorClass} transition-all duration-1000 ease-out rounded-full`} 
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
}