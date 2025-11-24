import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Au lieu de lister 50 pages privées, on liste juste les 2 pages publiques.
// Tout le reste de ton site sera automatiquement verrouillé.
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)'
]);

export default clerkMiddleware((auth, req) => {
  // La logique inversée : Si ce n'est PAS public, ALORS on protège.
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    // La configuration standard de Clerk pour intercepter les pages
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};