'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, History, Shield } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const isActive = (path) => pathname === path;

  const getLinkClass = (path) => {
    const active = isActive(path);
    // Style de base
    let base =
      'flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group ';
    // Conditional Mobile vs Desktop
    // Mobile: flex-col, text-xs, no-bg
    // Desktop: flex-row, text-base, hover-bg
    return (
      base +
      (active
        ? 'text-indigo-600 bg-indigo-50 font-bold'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium')
    );
  };

  return (
    <>
      {/* --- VERSION MOBILE (Bottom Bar) --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 ${
            isActive('/') ? 'text-indigo-600' : 'text-slate-400'
          }`}
        >
          <Home size={24} strokeWidth={isActive('/') ? 2.5 : 2} />
          <span
            className={`text-[10px] ${
              isActive('/') ? 'font-bold' : 'font-medium'
            }`}
          >
            Accueil
          </span>
        </Link>

        <Link
          href="/simulator"
          className={`flex flex-col items-center gap-1 ${
            isActive('/simulator') ? 'text-indigo-600' : 'text-slate-400'
          }`}
        >
          <PlusCircle
            size={24}
            strokeWidth={isActive('/simulator') ? 2.5 : 2}
          />
          <span
            className={`text-[10px] ${
              isActive('/simulator') ? 'font-bold' : 'font-medium'
            }`}
          >
            Ajouter
          </span>
        </Link>

        <Link
          href="/history"
          className={`flex flex-col items-center gap-1 ${
            isActive('/history') ? 'text-indigo-600' : 'text-slate-400'
          }`}
        >
          <History size={24} strokeWidth={isActive('/history') ? 2.5 : 2} />
          <span
            className={`text-[10px] ${
              isActive('/history') ? 'font-bold' : 'font-medium'
            }`}
          >
            Historique
          </span>
        </Link>
      </div>

      {/* --- VERSION DESKTOP (Sidebar Gauche) --- */}
      <div className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 flex-col z-50">
        {/* Logo Area */}
        <div className="p-6 flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Shield className="text-white" size={20} />
          </div>
          <span className="font-extrabold text-xl text-slate-800 tracking-tight">
            Coach<span className="text-indigo-600">.io</span>
          </span>
        </div>

        {/* Links */}
        <div className="flex-1 px-4 space-y-2">
          <Link href="/" className={getLinkClass('/')}>
            <Home size={20} />
            <span>Accueil</span>
          </Link>

          <Link href="/simulator" className={getLinkClass('/simulator')}>
            <PlusCircle size={20} />
            <span>Nouveau projet</span>
          </Link>

          <Link href="/history" className={getLinkClass('/history')}>
            <History size={20} />
            <span>Historique</span>
          </Link>
        </div>

        {/* Footer Sidebar (Optionnel) */}
        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-medium text-center">
              Mon Budget Sécurité
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
