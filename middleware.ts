import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// LISTE BLANCHE : Les seules routes accessibles sans être connecté
// 1. '/' : CRUCIAL pour la PWA. On laisse l'accès à l'accueil pour que l'app ne redirige pas.
//    C'est le fichier app/page.tsx qui décidera d'afficher le Login ou le Dashboard.
// 2. '/sign-in' & '/sign-up' : Pour pouvoir s'authentifier.
const isPublicRoute = createRouteMatcher([
  '/', 
  '/sign-in(.*)',
  '/sign-up(.*)'
]);

export default clerkMiddleware((auth, req) => {
  // RÈGLE : Si ce n'est PAS une route publique, on bloque l'accès (404/Redirection).
  // Mais comme '/' est public, l'utilisateur arrive sur la page d'accueil sans flash.
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    // Configuration standard pour ignorer les fichiers statiques (images, css...)
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};