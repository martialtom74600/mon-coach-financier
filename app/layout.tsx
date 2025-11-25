import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Navigation from '@/app/components/Navigation';
import Header from '@/app/components/Header';

// Imports Clerk
import { 
  ClerkProvider, 
  SignedIn, 
  SignedOut, 
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
  // On vérifie si l'utilisateur est connecté côté serveur
  // Cela nous permet d'adapter le CSS AVANT que la page ne s'affiche
  const { userId } = auth();
  const isConnected = !!userId;

  return (
    <ClerkProvider localization={frFR}>
      <html lang="fr">
        <head>
          <link rel="apple-touch-icon" href="/icon-192.png" />
        </head>
        <body className={`${inter.className} bg-slate-50 text-slate-900`}>
          
          {/* 1. CHARGEMENT */}
          <ClerkLoading>
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          </ClerkLoading>

          {/* 2. APPLICATION */}
          <ClerkLoaded>
            
            {/* MENU : Seulement si connecté */}
            <SignedIn>
              <Navigation />
            </SignedIn>

            {/* CONTENU PRINCIPAL (La correction est ici) */}
            {/* Si connecté : on met la marge à gauche (md:pl-64) pour le menu */}
            {/* Si PAS connecté : on met 0 marge pour le plein écran */}
            <main className={`min-h-screen transition-all duration-300 ${isConnected ? 'md:pl-64 pb-24 md:pb-0' : 'p-0'}`}>
              
              {/* CONTENEUR : Idem, on contraint la largeur seulement si connecté */}
              <div className={isConnected ? "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10" : "w-full h-full"}>
                
                <SignedIn>
                  <Header />
                </SignedIn>

                {/* On retire aussi la marge du haut (mt-6) si on est sur le login */}
                <div className={isConnected ? "mt-6" : ""}>
                  {children}
                </div>

              </div>
            </main>
            
            {/* CAS DÉCONNECTÉ : Plus besoin de logique spéciale ici, 
                car le main ci-dessus gère l'affichage de {children} (qui contient la page de login)
                en mode plein écran grâce à la condition isConnected */}
            
          </ClerkLoaded>

        </body>
      </html>
    </ClerkProvider>
  );
}