'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PlusCircle, History, Shield, User, LayoutDashboard } from 'lucide-react';

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
      {/* --- VERSION MOBILE (Bottom Bar) --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-50 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
        <div className="grid grid-cols-4 h-16">
          
          {/* 1. BILAN (ACCUEIL) */}
          <Link
            href="/"
            className={`flex flex-col items-center justify-center gap-1 ${
              isActive('/') ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LayoutDashboard size={22} strokeWidth={isActive('/') ? 2.5 : 2} />
            <span className={`text-[10px] ${isActive('/') ? 'font-bold' : 'font-medium'}`}>
              Bilan
            </span>
          </Link>

          {/* 2. SIMULATEUR */}
          <Link
            href="/simulator"
            className="flex flex-col items-center justify-center relative group"
          >
            <div className={`absolute -top-5 p-3 rounded-full shadow-lg border-4 border-white transition-transform group-active:scale-95 ${
                isActive('/simulator') ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white'
            }`}>
                <PlusCircle size={24} strokeWidth={2.5} />
            </div>
            <span className={`text-[10px] font-bold mt-8 ${isActive('/simulator') ? 'text-indigo-600' : 'text-slate-500'}`}>
              Simuler
            </span>
          </Link>

          {/* 3. HISTORIQUE */}
          <Link
            href="/history"
            className={`flex flex-col items-center justify-center gap-1 ${
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
            className={`flex flex-col items-center justify-center gap-1 ${
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

      {/* --- VERSION DESKTOP (Sidebar) --- */}
      <div className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 flex-col z-50">
        
        {/* Logo (Retour Accueil) */}
        <div className="p-6 flex items-center gap-3 mb-6">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Shield className="text-white" size={20} />
            </div>
            <span className="font-extrabold text-xl text-slate-800 tracking-tight">
              Coach<span className="text-indigo-600">.io</span>
            </span>
          </Link>
        </div>

        {/* Menus */}
        <div className="flex-1 px-4 space-y-2 flex flex-col">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-1 mt-2">
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

          <div className="mt-auto pt-6">
             <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                Configuration
             </div>
             <Link href="/profile" className={getLinkClass('/profile')}>
                <User size={20} />
                <span>Mon Profil</span>
             </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 font-medium">
              v1.0 &bull; Coach Financier
            </p>
          </div>
        </div>
      </div>
    </>
  );
}