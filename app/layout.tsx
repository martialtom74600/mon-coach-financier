import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Navigation from '@/app/components/Navigation';
import Header from '@/app/components/Header';

import { 
  ClerkProvider, 
  SignedIn, 
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
    <ClerkProvider localization={frFR}>
      <html lang="fr">
        <head>
          <link rel="apple-touch-icon" href="/icon-192.png" />
        </head>
        <body className={`${inter.className} bg-slate-50 text-slate-900`}>
          
          {/* 1. CHARGEMENT (Optionnel mais conseillé pour éviter le flash) */}
          <ClerkLoading>
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          </ClerkLoading>

          {/* 2. APPLICATION */}
          <ClerkLoaded>
            
            {/* BARRE LATÉRALE : S'affiche UNIQUEMENT si connecté */}
            <SignedIn>
              <Navigation />
            </SignedIn>

            {/* CONTENU PRINCIPAL */}
            {/* On garde ta structure originale. 
                Note : Sur PC, le formulaire de login sera légèrement décalé à droite 
                à cause du 'md:pl-64', mais sur Mobile (ta priorité), ce sera parfait. */}
            <main className="min-h-screen transition-all duration-300 md:pl-64 pb-24 md:pb-0">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10">
                
                {/* HEADER : S'affiche UNIQUEMENT si connecté */}
                <SignedIn>
                  <Header />
                </SignedIn>

                {/* LE CONTENU (Login ou Dashboard) */}
                {/* C'est app/page.tsx qui décide quoi afficher ici */}
                <div className="mt-6">
                  {children}
                </div>

              </div>
            </main>
            
          </ClerkLoaded>

        </body>
      </html>
    </ClerkProvider>
  );
}