'use client';

/**
 * Placeholder pour graphiques chargés en lazy (recharts / nivo) : garde le layout sans spinner bloquant.
 */
export default function ChartSkeleton({
  className = '',
  heightClass = 'h-[200px]',
  label = 'Chargement du graphique',
}: {
  className?: string;
  heightClass?: string;
  label?: string;
}) {
  return (
    <div
      className={`w-full rounded-xl bg-gradient-to-b from-slate-100 to-slate-50/80 animate-pulse ${heightClass} ${className}`.trim()}
      role="status"
      aria-label={label}
    />
  );
}
