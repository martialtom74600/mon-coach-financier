import PageRouteSkeleton from '@/app/components/ui/PageRouteSkeleton';

/**
 * Transition entre routes `(main)` : le layout (Header + Navigation) reste monté ;
 * seul l’emplacement de `{children}` est remplacé par ce squelette (Suspense Next.js).
 */
export default function MainSegmentLoading() {
  return (
    <div className="w-full pb-20 md:pb-0">
      <PageRouteSkeleton />
    </div>
  );
}
