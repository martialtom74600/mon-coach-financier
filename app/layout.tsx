import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Navigation from '@/app/components/Navigation';
import Header from '@/app/components/Header';
import { ToastProvider } from '@/app/components/ui/Toast';
import PushNotificationPrompt from '@/app/components/PushNotificationPrompt';
import ClientShell from '@/app/components/ClientShell';
import AppLoadingOverlay from '@/app/components/AppLoadingOverlay';
import { FinancialDataProvider } from '@/app/hooks/useFinancialData';

// Imports Clerk
import { ClerkProvider, SignedIn } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server'; // Pour vérifier l'état côté serveur
import { frFR } from "@clerk/localizations"; 

const inter = Inter({ subsets: ['latin'] });

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

// viewportFit: 'cover' pour gérer le "Notch" et la barre du bas sur iPhone
// maximumScale et userScalable retirés pour l'accessibilité (zoom autorisé)
export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  const isConnected = !!userId;

  return (
    <ClerkProvider localization={frFR}>
      <html lang="fr" className="h-full">
        <head>
          <link rel="apple-touch-icon" href="/icon-192.png" />
        </head>
        <body className={`${inter.className} bg-slate-50 text-slate-900 h-full`}>
          <ClientShell>
            <ToastProvider>
            <FinancialDataProvider>
            <AppLoadingOverlay />
            <SignedIn>
              <Navigation />
              <PushNotificationPrompt />
            </SignedIn>

            {/* CONTENU PRINCIPAL */}
            {/* LOGIQUE DE MARGE :
                - Mobile : pb-24 (padding bottom) pour ne pas être caché par la barre du bas
                - Desktop : md:pl-64 (padding left) pour laisser la place à la sidebar
                - Si pas connecté : p-0 pour le plein écran
            */}
            <main className={`min-h-screen transition-all duration-300 ${isConnected ? 'md:pl-64 pb-28 md:pb-0' : 'p-0'}`}>
              
              {/* CONTENEUR CENTRÉ : Largeur max contrainte seulement si connecté */}
              <div className={isConnected ? "w-full max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10" : "w-full h-full"}>
                
                {/* HEADER (Titre, Profil...) uniquement si connecté */}
                <SignedIn>
                  <Header />
                </SignedIn>

                {/* Le contenu de la page (Dashboard ou Login) */}
                <div className={isConnected ? "mt-6" : ""}>
                  {children}
                </div>

              </div>
            </main>
            </FinancialDataProvider>
            </ToastProvider>
          </ClientShell>

        </body>
      </html>
    </ClerkProvider>
  );
}