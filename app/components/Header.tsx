'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { UserButton, useUser } from '@clerk/nextjs';
import { useFinancialData } from '@/app/hooks/useFinancialData';

export default function Header() {
  const pathname = usePathname();
  const { user } = useUser();
  const { profile } = useFinancialData();
  const greetingName = profile?.firstName?.trim() || user?.firstName;
  const userName = greetingName ? ` ${greetingName}` : '';

  type PageContent = { title: string; emoji: string; subtitle: string };

  // Configuration des textes par page
  const pageContent: Record<string, PageContent> = {
    '/': {
      // C'est ici que la magie opère : Bonjour Thomas 👋
      title: `Bonjour${userName}`,
      emoji: '👋',
      subtitle: 'Ton QG financier, en direct.',
    },
    '/dashboard': { // Cas où l'utilisateur forcerait l'url /dashboard
      title: `Bonjour${userName}`,
      emoji: '👋',
      subtitle: 'Ton QG financier, en direct.',
    },
    '/profile': {
      title: 'Ton Profil',
      emoji: '👤',
      subtitle: 'On a besoin de te connaître pour te conseiller au top.',
    },
    '/goals': {
      title: 'Tes objectifs',
      emoji: '🎯',
      subtitle: 'Définis où tu veux aller, on trace la route ensemble.',
    },
    '/simulator': {
      title: 'Nouveau Projet',
      emoji: '🚀',
      subtitle: 'Un achat qui te démange ? On décortique.',
    },
    '/history': {
      title: 'Le Rétro',
      emoji: '📜',
      subtitle: "Tout ce que t'as déjà simulé, au même endroit.",
    },
  };

  // Contenu par défaut (page 404 ou inconnue)
  const content = pageContent[pathname] || {
    title: 'Coach Fi',
    emoji: '🛡️',
    subtitle: 'Reprends les commandes de ton argent.',
  };

  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 mb-8 animate-fade-in">
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
          {content.title}
          <span className="inline-block hover:animate-spin cursor-default text-3xl">
            {content.emoji}
          </span>
        </h1>
        <p className="text-slate-500 mt-2 text-base">
          {content.subtitle}
        </p>
      </div>
      <div className="mt-4 md:mt-0 flex items-center justify-start md:justify-end min-h-10 min-w-10 shrink-0">
        <UserButton
          afterSignOutUrl="/sign-in"
          appearance={{
            elements: {
              avatarBox: 'w-10 h-10',
            },
          }}
        />
      </div>
    </header>
  );
}