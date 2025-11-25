'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PlusCircle, History, Shield, User, LayoutDashboard } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  // Fonction utilitaire pour les classes CSS des liens Desktop
  const getLinkClass = (path: string) => {
    const active = isActive(path);
    let base = 'flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group ';
    return (
      base +
      (active
        ? 'text-indigo-600 bg-indigo-50 font-bold shadow-sm'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium')
    );
  };

  return (
    <>
      {/* =========================================================
          VERSION MOBILE (Bottom Bar)
          - Fixed bottom
          - padding-bottom spécifique pour iPhone (safe-area)
          - Backdrop blur pour effet verre
      ========================================================== */}
      <div 
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 z-50 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} // Sécurité native iPhone
      >
        <div className="grid grid-cols-4 h-16 items-center">
          
          {/* 1. BILAN (ACCUEIL) */}
          <Link
            href="/"
            className={`flex flex-col items-center justify-center gap-1 h-full ${
              isActive('/') ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LayoutDashboard size={22} strokeWidth={isActive('/') ? 2.5 : 2} />
            <span className={`text-[10px] ${isActive('/') ? 'font-bold' : 'font-medium'}`}>
              Bilan
            </span>
          </Link>

          {/* 2. SIMULATEUR (Bouton flottant "Pop-out") */}
          <Link
            href="/simulator"
            className="flex flex-col items-center justify-center relative group h-full"
          >
            {/* Le cercle violet dépasse de la barre grâce à -top-6 */}
            <div className={`absolute -top-6 p-3 rounded-full shadow-xl border-4 border-white transition-transform duration-200 active:scale-95 ${
                isActive('/simulator') ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white'
            }`}>
                <PlusCircle size={26} strokeWidth={2.5} />
            </div>
            {/* Texte aligné en bas */}
            <span className={`text-[10px] font-bold mt-8 ${isActive('/simulator') ? 'text-indigo-600' : 'text-slate-500'}`}>
              Simuler
            </span>
          </Link>

          {/* 3. HISTORIQUE */}
          <Link
            href="/history"
            className={`flex flex-col items-center justify-center gap-1 h-full ${
              isActive('/history') ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <History size={22} strokeWidth={isActive('/history') ? 2.5 : 2} />
            <span className={`text-[10px] ${isActive('/history') ? 'font-bold' : 'font-medium'}`}>
              Historique
            </span>
          </Link>

          {/* 4. PROFIL */}
          <Link
            href="/profile"
            className={`flex flex-col items-center justify-center gap-1 h-full ${
              isActive('/profile') ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <User size={22} strokeWidth={isActive('/profile') ? 2.5 : 2} />
            <span className={`text-[10px] ${isActive('/profile') ? 'font-bold' : 'font-medium'}`}>
              Profil
            </span>
          </Link>

        </div>
      </div>

      {/* =========================================================
          VERSION DESKTOP (Sidebar Gauche)
          - Fixed left, top, bottom
          - Largeur w-64
      ========================================================== */}
      <div className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 flex-col z-50">
        
        {/* Logo (Retour Accueil) */}
        <div className="p-6 flex items-center gap-3 mb-2">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
              <Shield className="text-white" size={20} />
            </div>
            <span className="font-extrabold text-xl text-slate-800 tracking-tight">
              Coach<span className="text-indigo-600">.io</span>
            </span>
          </Link>
        </div>

        {/* Menus */}
        <div className="flex-1 px-4 space-y-2 flex flex-col py-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Pilotage
          </div>
          
          <Link href="/" className={getLinkClass('/')}>
            <LayoutDashboard size={20} />
            <span>Mon Bilan</span>
          </Link>

          <Link href="/simulator" className={getLinkClass('/simulator')}>
            <PlusCircle size={20} />
            <span>Nouveau Projet</span>
          </Link>

          <Link href="/history" className={getLinkClass('/history')}>
            <History size={20} />
            <span>Historique</span>
          </Link>

          <div className="mt-auto pt-6 border-t border-slate-100">
             <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 mt-4">
               Configuration
             </div>
             <Link href="/profile" className={getLinkClass('/profile')}>
                <User size={20} />
                <span>Mon Profil</span>
             </Link>
          </div>
        </div>

        {/* Footer Sidebar */}
        <div className="p-4">
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <p className="text-[10px] text-slate-400 font-medium">
              Version 1.0 &bull; 2024
            </p>
          </div>
        </div>
      </div>
    </>
  );
}