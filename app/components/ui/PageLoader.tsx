'use client';

import React from 'react';

export interface PageLoaderProps {
  className?: string;
}

export default function PageLoader({ className = '' }: PageLoaderProps) {
  return (
    <div className={`min-h-[50vh] flex items-center justify-center ${className}`.trim()}>
      <div className="animate-pulse h-12 w-12 bg-slate-200 rounded-full" aria-hidden />
    </div>
  );
}
