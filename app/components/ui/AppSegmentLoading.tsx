import RouteLoadingSkeletonUI from '@/app/components/ui/RouteLoadingSkeletonUI';

/**
 * Contenu de remplacement unique pour les navigations dans l’app connectée :
 * même apparence partout, padding cohérent avec la nav mobile.
 *
 * Utiliser uniquement dans `app/(main)/loading.tsx` (et pas sous chaque dossier de route).
 */
export default function AppSegmentLoading() {
  return (
    <div className="w-full pb-20 md:pb-0">
      <RouteLoadingSkeletonUI />
    </div>
  );
}
