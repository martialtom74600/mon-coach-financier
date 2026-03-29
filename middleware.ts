import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { checkRateLimit } from '@/app/lib/ratelimit';

/** Ne jamais appeler auth().protect() sur ces chemins : redirection HTML casserait le SW, le manifest et le mode PWA. */
function isPwaOrAuthAssetPath(pathname: string): boolean {
  if (pathname === '/manifest.json') return true;
  if (pathname.endsWith('.webmanifest')) return true;
  if (pathname === '/sw.js') return true;
  if (
    pathname.startsWith('/workbox-') &&
    (pathname.endsWith('.js') || pathname.endsWith('.js.map'))
  ) {
    return true;
  }
  if (/^\/worker-[^/]+\.js(\.map)?$/.test(pathname)) return true;
  return false;
}

// Routes accessibles sans être connecté (le QG `/` est protégé : redirection sign-in gérée par Clerk)
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

const isApiRoute = createRouteMatcher(['/api(.*)']);
// F.3 — Route CRON : protégée par CRON_SECRET dans le handler, pas par Clerk
const isCronRoute = createRouteMatcher(['/api/cron(.*)']);
// Webhooks Clerk : signature Svix dans le handler, pas de session
const isClerkWebhookRoute = createRouteMatcher(['/api/webhooks/clerk']);

export default clerkMiddleware(async (auth, req) => {
  if (isPwaOrAuthAssetPath(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // F.3 — Cron : pas de rate limit ambiant ni Clerk (secret dans le handler)
  if (isCronRoute(req)) {
    return NextResponse.next();
  }

  if (isClerkWebhookRoute(req)) {
    return NextResponse.next();
  }

  // E.1 — Rate limit uniquement sur les mutations (POST/PATCH/PUT/DELETE).
  // Les GET /api (lectures) évitent un aller-retour Redis → latence bien plus fluide.
  if (isApiRoute(req)) {
    const method = req.method.toUpperCase();
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      const { userId } = auth();
      const result = await checkRateLimit(req, userId);
      if (!result.success) {
        return new NextResponse('Too Many Requests', { status: 429 });
      }
    }
  }

  // RÈGLE : Si ce n'est PAS une route publique, on bloque l'accès (404/Redirection).
  // unauthenticatedUrl relatif : reste dans le scope PWA (pas d’Account Portal clerk.com → pas de barre Safari/Chrome).
  if (!isPublicRoute(req)) {
    auth().protect({
      unauthenticatedUrl: '/sign-in',
      unauthorizedUrl: '/sign-in',
    });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Configuration standard pour ignorer les fichiers statiques (images, css...)
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};