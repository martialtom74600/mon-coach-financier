'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useFinancialData } from '@/app/hooks/useFinancialData';

export default function Header() {
  const pathname = usePathname();
  const { profile } = useFinancialData();

  // Récupération sécurisée du prénom
  const userName = profile?.firstName ? ` ${profile.firstName}` : '';

  // Configuration des textes par page
  const pageContent: any = {
    '/': {
      // C'est ici que la magie opère : Bonjour Thomas 👋
      title: `Bonjour${userName}`,
      emoji: '👋',
      subtitle: 'Voici ton bilan financier en temps réel.',
    },
    '/dashboard': { // Cas où l'utilisateur forcerait l'url /dashboard
      title: `Bonjour${userName}`,
      emoji: '👋',
      subtitle: 'Voici ton bilan financier en temps réel.',
    },
    '/profile': {
      title: 'Mon Profil',
      emoji: '👤',
      subtitle: 'Configure ta situation pour affiner le coach.',
    },
    '/simulator': {
      title: 'Nouveau Projet',
      emoji: '🚀',
      subtitle: 'Analyse un achat avant de craquer.',
    },
    '/history': {
      title: 'Historique',
      emoji: '📜',
      subtitle: 'Retrouve toutes tes décisions passées.',
    },
  };

  // Contenu par défaut (page 404 ou inconnue)
  const content = pageContent[pathname] || {
    title: 'Coach Fi',
    emoji: '🛡️',
    subtitle: 'Prenez le contrôle de votre budget.',
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
    </header>
  );
}