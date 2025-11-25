import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Navigation from '@/app/components/Navigation';
import Header from '@/app/components/Header';

// Imports Clerk
import { 
  ClerkProvider, 
  SignedIn, 
  ClerkLoading, 
  ClerkLoaded 
} from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server'; // Pour vérifier l'état côté serveur
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

// AJOUT IMPORTANT : viewportFit: 'cover' pour gérer le "Notch" et la barre du bas sur iPhone
export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', 
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // On vérifie si l'utilisateur est connecté côté serveur
  // Cela nous permet d'adapter le CSS AVANT que la page ne s'affiche
  const { userId } = auth();
  const isConnected = !!userId;

  return (
    <ClerkProvider localization={frFR}>
      <html lang="fr" className="h-full">
        <head>
          <link rel="apple-touch-icon" href="/icon-192.png" />
        </head>
        <body className={`${inter.className} bg-slate-50 text-slate-900 h-full`}>
          
          {/* 1. CHARGEMENT (Spinner centré) */}
          <ClerkLoading>
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          </ClerkLoading>

          {/* 2. APPLICATION CHARGÉE */}
          <ClerkLoaded>
            
            {/* MENU : Seulement si connecté */}
            <SignedIn>
              <Navigation />
            </SignedIn>

            {/* CONTENU PRINCIPAL */}
            {/* LOGIQUE DE MARGE :
                - Mobile : pb-24 (padding bottom) pour ne pas être caché par la barre du bas
                - Desktop : md:pl-64 (padding left) pour laisser la place à la sidebar
                - Si pas connecté : p-0 pour le plein écran
            */}
            <main className={`min-h-screen transition-all duration-300 ${isConnected ? 'md:pl-64 pb-28 md:pb-0' : 'p-0'}`}>
              
              {/* CONTENEUR CENTRÉ : Largeur max contrainte seulement si connecté */}
              <div className={isConnected ? "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10" : "w-full h-full"}>
                
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
            
          </ClerkLoaded>

        </body>
      </html>
    </ClerkProvider>
  );
}