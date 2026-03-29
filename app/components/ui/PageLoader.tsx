'use client';

import RouteLoadingSkeletonUI from '@/app/components/ui/RouteLoadingSkeletonUI';

export interface PageLoaderProps {
  className?: string;
  /** `page` = zone principale ; `compact` = liste ou encart */
  variant?: 'page' | 'compact';
}

/**
 * Variante client du squelette route (dynamic(), Suspense, gates `isLoaded`).
 * Même rendu que les `loading.tsx` via {@link RouteLoadingSkeletonUI}.
 */
export default function PageLoader({ className = '', variant = 'page' }: PageLoaderProps) {
  const compact = variant === 'compact';
  return <RouteLoadingSkeletonUI compact={compact} className={className} />;
}
