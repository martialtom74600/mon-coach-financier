import RouteLoadingSkeletonUI from '@/app/components/ui/RouteLoadingSkeletonUI';

export default function PageRouteSkeleton({ compact = false }: { compact?: boolean }) {
  return <RouteLoadingSkeletonUI compact={compact} />;
}
