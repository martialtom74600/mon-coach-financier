import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Edge-only : aucun import Prisma, Upstash, Node ou autre API non-Web.
 * Rate limiting des mutations API : à traiter dans chaque route handler (runtime Node).
 */

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

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);
const isCronRoute = createRouteMatcher(['/api/cron(.*)']);
const isClerkWebhookRoute = createRouteMatcher(['/api/webhooks/clerk']);

export default clerkMiddleware((auth, req) => {
  if (isPwaOrAuthAssetPath(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (isCronRoute(req) || isClerkWebhookRoute(req)) {
    return NextResponse.next();
  }

  if (!isPublicRoute(req)) {
    /**
     * Chemin relatif uniquement : même origine que la PWA (pas de compte Clerk hébergé).
     * On n’utilise pas `unauthorizedUrl` ici : pour un utilisateur connecté mais non autorisé,
     * Clerk gère le défaut (évite des redirects ambigus avec les catch-all `/sign-in/[[...]]`).
     */
    auth().protect({ unauthenticatedUrl: '/sign-in' });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
