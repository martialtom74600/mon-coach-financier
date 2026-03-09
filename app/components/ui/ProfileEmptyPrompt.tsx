'use client';

import React from 'react';
import { ArrowRight, LucideIcon } from 'lucide-react';
import Button from '@/app/components/ui/Button';

export interface ProfileEmptyPromptProps {
  message: string;
  title?: string;
  buttonLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
  variant?: 'full' | 'compact' | 'minimal';
}

export default function ProfileEmptyPrompt({
  title = '',
  message,
  buttonLabel = '',
  onAction = () => {},
  icon: Icon = () => null,
  variant = 'full',
}: ProfileEmptyPromptProps) {
  if (variant === 'minimal') {
    return (
      <div className="p-10 text-center text-slate-500">{message}</div>
    );
  }

  const isFull = variant === 'full';
  const containerClass = isFull
    ? 'flex flex-col items-center justify-center bg-white p-8 text-center rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 min-h-[60vh] max-w-2xl mx-auto mt-10'
    : 'min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in';

  const iconContainerClass = isFull
    ? 'w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 animate-bounce'
    : 'p-4 bg-indigo-50 text-indigo-600 rounded-full mb-6';

  const titleClass = isFull
    ? 'text-4xl font-black text-slate-900 mb-4 tracking-tight'
    : 'text-2xl font-bold text-slate-800 mb-3';

  const messageClass = isFull
    ? 'text-slate-500 text-lg max-w-md mb-8 leading-relaxed'
    : 'text-slate-500 max-w-md mb-8';

  return (
    <div className={containerClass}>
      <div className={iconContainerClass}>
        <Icon size={isFull ? 40 : 48} className="text-indigo-600" />
      </div>
      <h1 className={titleClass}>{title}</h1>
      <p className={messageClass}>{message}</p>
      {isFull ? (
        <button
          onClick={onAction}
          className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-xl hover:shadow-2xl hover:bg-indigo-600 flex items-center gap-2"
        >
          {buttonLabel} <ArrowRight size={20} />
        </button>
      ) : (
        <Button onClick={onAction}>{buttonLabel}</Button>
      )}
    </div>
  );
}
