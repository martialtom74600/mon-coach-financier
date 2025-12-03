'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  PlusCircle, History, Shield, User, 
  LayoutDashboard, Target // <--- Import de l'icône Target
} from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

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
      ========================================================== */}
      <div 
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 z-50 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-5 h-16 items-center"> {/* Passage à 5 colonnes pour tout caser */}
          
          {/* 1. BILAN */}
          <Link href="/" className={`flex flex-col items-center justify-center gap-1 h-full ${isActive('/') ? 'text-indigo-600' : 'text-slate-400'}`}>
            <LayoutDashboard size={20} strokeWidth={isActive('/') ? 2.5 : 2} />
            <span className={`text-[9px] ${isActive('/') ? 'font-bold' : 'font-medium'}`}>Bilan</span>
          </Link>

          {/* 2. OBJECTIFS (Nouveau !) */}
          <Link href="/goals" className={`flex flex-col items-center justify-center gap-1 h-full ${isActive('/goals') ? 'text-indigo-600' : 'text-slate-400'}`}>
            <Target size={20} strokeWidth={isActive('/goals') ? 2.5 : 2} />
            <span className={`text-[9px] ${isActive('/goals') ? 'font-bold' : 'font-medium'}`}>Objectifs</span>
          </Link>

          {/* 3. SIMULATEUR (Central) */}
          <Link href="/simulator" className="flex flex-col items-center justify-center relative group h-full">
            <div className={`absolute -top-5 p-2.5 rounded-full shadow-xl border-4 border-white transition-transform duration-200 active:scale-95 bg-indigo-600 text-white`}>
                <PlusCircle size={24} strokeWidth={2.5} />
            </div>
            <span className={`text-[9px] font-bold mt-7 ${isActive('/simulator') ? 'text-indigo-600' : 'text-slate-500'}`}>Simuler</span>
          </Link>

          {/* 4. HISTORIQUE */}
          <Link href="/history" className={`flex flex-col items-center justify-center gap-1 h-full ${isActive('/history') ? 'text-indigo-600' : 'text-slate-400'}`}>
            <History size={20} strokeWidth={isActive('/history') ? 2.5 : 2} />
            <span className={`text-[9px] ${isActive('/history') ? 'font-bold' : 'font-medium'}`}>History</span>
          </Link>

          {/* 5. PROFIL */}
          <Link href="/profile" className={`flex flex-col items-center justify-center gap-1 h-full ${isActive('/profile') ? 'text-indigo-600' : 'text-slate-400'}`}>
            <User size={20} strokeWidth={isActive('/profile') ? 2.5 : 2} />
            <span className={`text-[9px] ${isActive('/profile') ? 'font-bold' : 'font-medium'}`}>Profil</span>
          </Link>

        </div>
      </div>

      {/* =========================================================
          VERSION DESKTOP (Sidebar Gauche)
      ========================================================== */}
      <div className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 flex-col z-50">
        
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

        <div className="flex-1 px-4 space-y-2 flex flex-col py-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Pilotage</div>
          
          <Link href="/" className={getLinkClass('/')}>
            <LayoutDashboard size={20} />
            <span>Mon bilan</span>
          </Link>

          {/* Ajout du lien Objectifs ici */}
          <Link href="/goals" className={getLinkClass('/goals')}>
            <Target size={20} />
            <span>Mes Objectifs</span>
          </Link>

          <Link href="/simulator" className={getLinkClass('/simulator')}>
            <PlusCircle size={20} />
            <span>Simulateur Achat</span>
          </Link>

          <Link href="/history" className={getLinkClass('/history')}>
            <History size={20} />
            <span>Historique</span>
          </Link>

          <div className="mt-auto pt-6 border-t border-slate-100">
             <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 mt-4">Configuration</div>
             <Link href="/profile" className={getLinkClass('/profile')}>
                <User size={20} />
                <span>Mon profil</span>
             </Link>
          </div>
        </div>

        <div className="p-4">
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <p className="text-[10px] text-slate-400 font-medium">Version 2.0 &bull; Coach Goals</p>
          </div>
        </div>
      </div>
    </>
  );
}