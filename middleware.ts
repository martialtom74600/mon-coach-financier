import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { checkRateLimit } from '@/app/lib/ratelimit';

// Routes d'auth accessibles sans être connecté
const isAuthRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

// '/' est public mais on redirige vers /sign-in si non connecté (évite le flash)
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

const isApiRoute = createRouteMatcher(['/api(.*)']);
// F.3 — Route CRON : protégée par CRON_SECRET dans le handler, pas par Clerk
const isCronRoute = createRouteMatcher(['/api/cron(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // E.1 — Rate limiting sur toutes les routes API (20 req/10s par IP)
  if (isApiRoute(req)) {
    const result = await checkRateLimit(req);
    if (!result.success) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }

  // F.3 — Les routes CRON bypassent Clerk (auth via CRON_SECRET dans le handler)
  if (isCronRoute(req)) {
    return NextResponse.next();
  }

  // Redirection / → /sign-in si non connecté (dans le middleware = pas de flash)
  if (req.nextUrl.pathname === '/' && !isAuthRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
  }

  // RÈGLE : Si ce n'est PAS une route publique, on bloque l'accès (404/Redirection).
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