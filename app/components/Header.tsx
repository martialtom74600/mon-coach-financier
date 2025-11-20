'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  // Configuration des textes par page
  const pageContent = {
    '/': {
      title: 'Bonjour',
      emoji: '👋',
      subtitle: 'Voici ton aperçu financier en temps réel.',
    },
    '/profile': {
      title: 'Mon Profil',
      emoji: '👤',
      subtitle: 'Gère tes revenus et tes charges fixes ici.',
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

  // Contenu par défaut (sécurité)
  const content = pageContent[pathname] || {
    title: 'Coach Fi',
    emoji: '🛡️',
    subtitle: 'Prenez le contrôle de votre budget.',
  };

  return (
    <header className="flex justify-between items-end border-b border-slate-200 pb-6 mb-8 animate-fade-in">
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
          {content.title}{' '}
          <span className="inline-block hover:animate-pulse cursor-default">
            {content.emoji}
          </span>
        </h1>
        <p className="text-slate-500 mt-2 text-base md:text-lg">
          {content.subtitle}
        </p>
      </div>
    </header>
  );
}