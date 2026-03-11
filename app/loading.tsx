import AppLoadingScreen from '@/app/components/AppLoadingScreen';

/**
 * Écran de chargement affiché par Next.js pendant la navigation entre pages
 */
export default function Loading() {
  return <AppLoadingScreen message="Chargement..." />;
}
