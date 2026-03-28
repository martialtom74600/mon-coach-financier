'use client';

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/** Reporte l’exécution après peinture / idle (Safari : setTimeout). Retourne une fonction d’annulation. */
function runWhenIdle(cb: () => void): () => void {
  if (typeof window === 'undefined') {
    cb();
    return () => {};
  }
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(() => cb(), { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = globalThis.setTimeout(cb, 500);
  return () => globalThis.clearTimeout(id);
}

export interface LazyRenderProps {
  children: ReactNode;
  fallback: ReactNode;
  /** Marge autour du root (ex. `"100px"` pour précharger un peu avant d’être visible). */
  rootMargin?: string;
  threshold?: number | number[];
  /** Hauteur minimale du conteneur pour stabiliser le layout (recommandé pour éviter le CLS). */
  minHeightClass?: string;
  className?: string;
}

/**
 * Ne monte `children` qu’après intersection, puis après une fenêtre idle / délai :
 * laisse le navigateur finir le premier paint (LCP) avant un coût CPU lourd (ex. Recharts).
 */
export default function LazyRender({
  children,
  fallback,
  rootMargin = '0px',
  threshold = 0,
  minHeightClass = 'min-h-[200px]',
  className = '',
}: LazyRenderProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    let cancelled = false;
    let cancelScheduled: (() => void) | undefined;

    const scheduleShow = () => {
      cancelScheduled?.();
      cancelScheduled = runWhenIdle(() => {
        if (!cancelled) setVisible(true);
      });
    };

    if (!el || typeof IntersectionObserver === 'undefined') {
      scheduleShow();
      return () => {
        cancelled = true;
        cancelScheduled?.();
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || cancelled) return;
        cancelScheduled?.();
        cancelScheduled = runWhenIdle(() => {
          if (!cancelled) setVisible(true);
        });
        observer.disconnect();
      },
      { root: null, rootMargin, threshold }
    );

    observer.observe(el);
    return () => {
      cancelled = true;
      cancelScheduled?.();
      observer.disconnect();
    };
  }, [visible, rootMargin, threshold]);

  return (
    <div
      ref={ref}
      className={`w-full ${minHeightClass} ${className}`.trim()}
      data-lazy-render={visible ? 'ready' : 'pending'}
    >
      {visible ? children : fallback}
    </div>
  );
}
