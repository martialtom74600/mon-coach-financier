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
  openGraph: {
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
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
        
        {/* 2. NAVIGATION GLOBALE (Menu) */}
        <Navigation />

        {/* 3. WRAPPER INTELLIGENT (Marges pour le menu) */}
        <main className="min-h-screen transition-all duration-300 md:pl-64 pb-24 md:pb-0">
          
          {/* 4. CONTENEUR GLOBAL (Centrage et padding du contenu) */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10">
            
            {/* 5. HEADER AUTOMATIQUE (Change selon la page) */}
            <Header />

            {/* Le contenu spécifique de chaque page s'insère ici */}
            {children}
          </div>

        </main>
        
      </body>
    </html>
  );
}