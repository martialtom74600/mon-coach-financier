import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google'; // On garde la font Inter !
import Navigation from '@/app/components/Navigation';
import Header from '@/app/components/Header';

// Imports de sécurité indispensables (Ajout de ClerkLoading et ClerkLoaded)
import { 
  ClerkProvider, 
  SignedIn, 
  SignedOut, 
  RedirectToSignIn,
  ClerkLoading,
  ClerkLoaded 
} from '@clerk/nextjs';
import { frFR } from "@clerk/localizations"; 

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mon Coach Financier',
  description: 'Prenez le contrôle de votre budget.',
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
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // On garde le Provider Clerk pour que l'auth fonctionne
    <ClerkProvider localization={frFR}>
      <html lang="fr">
        <head>
          <link rel="apple-touch-icon" href="/icon-192.png" />
        </head>
        {/* On réapplique la classe inter.className ici pour toute l'app */}
        <body className={`${inter.className} bg-slate-50 text-slate-900`}>
          
          {/* 1. PENDANT LE CHARGEMENT (Évite l'écran blanc sur mobile) */}
          <ClerkLoading>
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="text-slate-500 font-medium animate-pulse">Chargement de ton espace...</p>
            </div>
          </ClerkLoading>

          {/* 2. UNE FOIS CHARGÉ (Affiche ton app ou redirige) */}
          <ClerkLoaded>
            
            {/* SI CONNECTÉ : On affiche ton layout complet avec la font Inter */}
            <SignedIn>
              <Navigation />

              <main className="min-h-screen transition-all duration-300 md:pl-64 pb-24 md:pb-0">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10">
                  <Header />
                  <div className="mt-6">
                    {children}
                  </div>
                </div>
              </main>
            </SignedIn>

            {/* SI NON CONNECTÉ : On redirige (l'utilisateur ne voit rien de l'interface) */}
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
            
          </ClerkLoaded>

        </body>
      </html>
    </ClerkProvider>
  );
}