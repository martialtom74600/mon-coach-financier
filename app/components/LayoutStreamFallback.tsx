import Image from 'next/image';

/** Aligné sur globals.css / slate-50 — premier paint avant streaming du layout async. */
const BG = '#f8fafc';

/**
 * Fallback Suspense pour le layout racine : HTML immédiat (cold start / PWA),
 * sans attendre auth() ni le fetch profil.
 */
export default function LayoutStreamFallback() {
  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center"
      style={{ backgroundColor: BG, fontFamily: 'system-ui, sans-serif' }}
      aria-busy={true}
      aria-label="Chargement"
    >
      <Image
        src="/icon-192.png"
        width={80}
        height={80}
        alt=""
        priority
        unoptimized
        className="rounded-2xl shadow-lg shadow-indigo-500/20"
      />
      <p className="mt-5 text-sm font-semibold text-slate-500 tracking-tight">
        Mon Coach Financier
      </p>
      <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full w-2/5 animate-pulse rounded-full bg-indigo-500/70" />
      </div>
    </div>
  );
}
