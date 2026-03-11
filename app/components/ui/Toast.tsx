'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type ToastVariant = 'error' | 'success' | 'info';

interface ToastState {
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const variantStyles: Record<ToastVariant, string> = {
  error: 'bg-rose-50 border-rose-200 text-rose-800',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  info: 'bg-indigo-50 border-indigo-200 text-indigo-800',
};

const AUTO_DISMISS_MS = 4500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, variant: ToastVariant = 'error') => {
    setToast({ message, variant });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div
          role="alert"
          className={`fixed bottom-24 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:max-w-sm z-50 px-4 py-3 rounded-xl border shadow-lg animate-fade-in ${variantStyles[toast.variant]}`}
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}
