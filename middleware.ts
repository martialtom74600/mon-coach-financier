import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { checkRateLimit } from '@/app/lib/ratelimit';

// Routes accessibles sans être connecté (le QG `/` est protégé : redirection sign-in gérée par Clerk)
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

const isApiRoute = createRouteMatcher(['/api(.*)']);
// F.3 — Route CRON : protégée par CRON_SECRET dans le handler, pas par Clerk
const isCronRoute = createRouteMatcher(['/api/cron(.*)']);
// Webhooks Clerk : signature Svix dans le handler, pas de session
const isClerkWebhookRoute = createRouteMatcher(['/api/webhooks/clerk']);

export default clerkMiddleware(async (auth, req) => {
  // F.3 — Cron : pas de rate limit ambiant ni Clerk (secret dans le handler)
  if (isCronRoute(req)) {
    return NextResponse.next();
  }

  if (isClerkWebhookRoute(req)) {
    return NextResponse.next();
  }

  // E.1 — Rate limiting API : par userId si session, sinon par IP
  if (isApiRoute(req)) {
    const { userId } = auth();
    const result = await checkRateLimit(req, userId);
    if (!result.success) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }

  // RÈGLE : Si ce n'est PAS une route publique, on bloque l'accès (404/Redirection).
  // La redirection / → /sign-in se fait dans page.tsx (évite les conflits de timing après connexion)
  if (!isPublicRoute(req)) {
    auth().protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Configuration standard pour ignorer les fichiers statiques (images, css...)
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    // PWA : sw.js et worker-*.js doivent passer par le middleware pour que Clerk soit initialisé
    '/sw.js',
    '/worker-:hash.js',
  ],
};