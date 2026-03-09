import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { checkRateLimit } from '@/app/lib/ratelimit';

// LISTE BLANCHE : Les seules routes accessibles sans être connecté
// 1. '/' : CRUCIAL pour la PWA. On laisse l'accès à l'accueil pour que l'app ne redirige pas.
//    C'est le fichier app/page.tsx qui décidera d'afficher le Login ou le Dashboard.
// 2. '/sign-in' & '/sign-up' : Pour pouvoir s'authentifier.
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

const isApiRoute = createRouteMatcher(['/api(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // E.1 — Rate limiting sur toutes les routes API (20 req/10s par IP)
  if (isApiRoute(req)) {
    const result = await checkRateLimit(req);
    if (!result.success) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }

  // RÈGLE : Si ce n'est PAS une route publique, on bloque l'accès (404/Redirection).
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