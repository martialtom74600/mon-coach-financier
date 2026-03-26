import AppLoadingScreen from '@/app/components/AppLoadingScreen';

/**
 * Navigation entre pages : pas de pourcentage mesurable côté Next → barre indéterminée.
 */
export default function Loading() {
  return <AppLoadingScreen progress={null} message="Chargement de la page…" />;
}
