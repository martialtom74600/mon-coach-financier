/**
 * Routes Clerk : pas de squelette type « QG » (évite tout chevauchement avec AuthLayout).
 * Surface neutre alignée sur la colonne formulaire (mobile bg-white).
 */
export default function AuthSegmentLoading() {
  return (
    <div
      className="min-h-[40vh] w-full bg-white md:bg-transparent"
      aria-busy={true}
      aria-label="Chargement"
    />
  );
}
