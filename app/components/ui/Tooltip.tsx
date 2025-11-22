import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function Tooltip({ text }: { text: string }) {
  return (
    <div className="group relative flex items-center inline-block ml-1">
      <HelpCircle size={14} className="text-slate-300 hover:text-indigo-500 cursor-help transition-colors" />
      
      {/* Bulle noire */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] leading-snug rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
        {text}
        {/* Petite flèche CSS vers le bas */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
      </div>
    </div>
  );
}