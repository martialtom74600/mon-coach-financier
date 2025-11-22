import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Navigation from '@/app/components/Navigation';
import Header from '@/app/components/Header';

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
    <html lang="fr">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${inter.className} bg-slate-50 text-slate-900`}>
        
        {/* 1. NAVIGATION (Barre latérale ou inférieure) */}
        <Navigation />

        {/* 2. WRAPPER PRINCIPAL */}
        {/* md:pl-64 : Laisse l'espace pour la sidebar à gauche sur Desktop */}
        {/* pb-24 : Laisse l'espace pour la bottom-bar en bas sur Mobile */}
        <main className="min-h-screen transition-all duration-300 md:pl-64 pb-24 md:pb-0">
          
          {/* 3. CONTENEUR CENTRÉ (Limite la largeur pour la lisibilité) */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10">
            
            {/* 4. HEADER AUTOMATIQUE (Titre de la page + Date) */}
            <Header />

            {/* 5. CONTENU DE LA PAGE COURANTE (Injecté ici) */}
            <div className="mt-6">
              {children}
            </div>

          </div>

        </main>
        
      </body>
    </html>
  );
}