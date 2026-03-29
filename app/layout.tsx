import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { frFR } from '@clerk/localizations';
import { getClerkAllowedRedirectOrigins } from '@/app/lib/clerkAppOrigin';
import RootLayoutShell from '@/app/RootLayoutShell';
import LayoutStreamFallback from '@/app/components/LayoutStreamFallback';

/** `optional` : le texte (LCP hero) peut s’afficher tout de suite avec le fallback ; évite d’attendre le WOFF2 sur 4G. */
const inter = Inter({
  subsets: ['latin'],
  display: 'optional',
  adjustFontFallback: true,
  preload: true,
});

/** Même teinte que `globals.css` (slate-50) — évite l’écran noir avant CSS / streaming. */
const SHELL_BG = '#f8fafc';

export const metadata: Metadata = {
  title: 'Mon Coach Financier',
  description: 'Reprends les commandes de ton argent.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Coach Fi',
  },
};

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/**
 * Layout racine synchrone : premier HTML tout de suite (fond + Suspense).
 * Le travail lent (auth + profil) vit dans RootLayoutShell (async + streaming).
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkRedirectOrigins = getClerkAllowedRedirectOrigins();

  return (
    <ClerkProvider
      localization={frFR}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      {...(clerkRedirectOrigins ? { allowedRedirectOrigins: clerkRedirectOrigins } : {})}
    >
      <html
        lang="fr"
        className="h-full"
        style={{ backgroundColor: SHELL_BG }}
      >
        <head>
          <link rel="apple-touch-icon" href="/icon-192.png" />
        </head>
        <body
          className={`${inter.className} bg-slate-50 text-slate-900 h-full`}
          style={{ backgroundColor: SHELL_BG }}
        >
          <Suspense fallback={<LayoutStreamFallback />}>
            <RootLayoutShell>{children}</RootLayoutShell>
          </Suspense>
        </body>
      </html>
    </ClerkProvider>
  );
}
