import type { ReactNode } from 'react';

/**
 * En-tête statique (Server Component) : texte disponible dès le 1er HTML sans exécuter le bundle page client.
 */
export default function RoutePageHeader({
  title,
  subtitle,
  leading,
  className = '',
}: {
  title: string;
  subtitle?: string;
  /** Pictogramme ou badge (icône Lucide OK en RSC ici). */
  leading?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`mb-6 flex items-start gap-3 ${className}`.trim()}>
      {leading ? <div className="shrink-0 pt-0.5">{leading}</div> : null}
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {subtitle ? (
          <p className="text-slate-500 text-sm mt-1 max-w-2xl leading-relaxed">{subtitle}</p>
        ) : null}
      </div>
    </header>
  );
}
