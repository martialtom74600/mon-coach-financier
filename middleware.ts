import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Edge (Vercel) : aucun Node / Prisma / Redis.
 *
 * Cause racine du crash « Load failed » / 500 middleware avec
 * `auth().protect({ unauthenticatedUrl: '/sign-in' })` : Clerk appelle alors
 * `NextResponse.redirect('/sign-in')` avec une URL **relative**. Sur Edge,
 * la résolution pour `Location` / navigations internes échoue souvent → TypeError.
 *
 * Ici : `req.nextUrl.clone()` + `pathname` → URL **absolue même origine** (périmètre PWA OK).
 * Pour les API sans session : 401 JSON (comportement proche de Clerk pour non-document).
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
const isApiRoute = createRouteMatcher(['/api(.*)']);
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
    const { userId } = auth();

    if (!userId) {
      if (isApiRoute(req)) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 },
        );
      }

      const signIn = req.nextUrl.clone();
      signIn.pathname = '/sign-in';
      signIn.search = '';

      const p = req.nextUrl.pathname;
      if (p !== '/sign-in' && !p.startsWith('/sign-in/') && p !== '/sign-up' && !p.startsWith('/sign-up/')) {
        signIn.searchParams.set('redirect_url', req.nextUrl.href);
      }

      return NextResponse.redirect(signIn);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
