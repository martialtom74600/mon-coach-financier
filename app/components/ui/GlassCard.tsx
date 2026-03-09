'use client';

import React from 'react';

export interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function GlassCard({ children, className = '', onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-100 shadow-sm rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:border-indigo-100 hover:-translate-y-0.5 ${className}`}
    >
      {children}
    </div>
  );
}
