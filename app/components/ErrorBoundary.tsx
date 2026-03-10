'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Displayed in the fallback UI heading. Defaults to "Cette section". */
  sectionName?: string;
  /** Fully custom fallback — receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Generic React Error Boundary for wrapping individual UI sections.
 *
 * Usage:
 *   <ErrorBoundary sectionName="Simulateur">
 *     <SimulatorView />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[ErrorBoundary:${this.props.sectionName ?? 'unknown'}]`, error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    const section = this.props.sectionName ?? 'Cette section';

    return (
      <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center space-y-4 shadow-sm">
        <div className="mx-auto w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {section} n&apos;a pas pu se charger
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Oups, un petit bug de calcul. Tes données sont intactes, pas de panique.
          </p>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <p className="text-xs font-mono text-rose-500 bg-rose-50 px-3 py-2 rounded-lg break-words">
            {error.message}
          </p>
        )}
        <button
          onClick={this.reset}
          className="bg-slate-900 hover:bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          Réessayer
        </button>
      </div>
    );
  }
}
