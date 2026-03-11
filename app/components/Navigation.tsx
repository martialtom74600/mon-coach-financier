'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  PlusCircle, History, Shield, User, 
  LayoutDashboard, Target, Settings, Menu, X
} from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
          VERSION MOBILE — 4 items + Menu (plus accessible)
          Zones tactiles 44px min, moins d'icônes = plus d'espace
      ========================================================== */}
      <div 
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50 shadow-[0_-4px_15px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-5 h-[72px] items-stretch">
          
          {/* 1. LE QG */}
          <Link 
            href="/" 
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] active:scale-95 transition-transform ${isActive('/') ? 'text-indigo-600' : 'text-slate-500'}`}
            aria-label="Le QG"
          >
            <LayoutDashboard size={24} strokeWidth={isActive('/') ? 2.5 : 2} />
            <span className={`text-[11px] font-medium ${isActive('/') ? 'font-bold' : ''}`}>QG</span>
          </Link>

          {/* 2. OBJECTIFS */}
          <Link 
            href="/goals" 
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] active:scale-95 transition-transform ${isActive('/goals') ? 'text-indigo-600' : 'text-slate-500'}`}
            aria-label="Objectifs"
          >
            <Target size={24} strokeWidth={isActive('/goals') ? 2.5 : 2} />
            <span className={`text-[11px] font-medium ${isActive('/goals') ? 'font-bold' : ''}`}>Objectifs</span>
          </Link>

          {/* 3. SIMULATEUR (Central, FAB) */}
          <Link 
            href="/simulator" 
            className="flex flex-col items-center justify-center relative min-h-[44px] active:scale-95 transition-transform"
            aria-label="Simuler un achat"
          >
            <div className={`absolute -top-6 p-3 rounded-full shadow-xl border-4 border-white transition-transform bg-indigo-600 text-white ${isActive('/simulator') ? 'ring-2 ring-indigo-300' : ''}`}>
              <PlusCircle size={28} strokeWidth={2.5} />
            </div>
            <span className={`text-[11px] font-bold mt-8 ${isActive('/simulator') ? 'text-indigo-600' : 'text-slate-600'}`}>Simuler</span>
          </Link>

          {/* 4. RÉTRO */}
          <Link 
            href="/history" 
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] active:scale-95 transition-transform ${isActive('/history') ? 'text-indigo-600' : 'text-slate-500'}`}
            aria-label="Le Rétro"
          >
            <History size={24} strokeWidth={isActive('/history') ? 2.5 : 2} />
            <span className={`text-[11px] font-medium ${isActive('/history') ? 'font-bold' : ''}`}>Rétro</span>
          </Link>

          {/* 5. MENU (ouvre bottom sheet) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] active:scale-95 transition-transform ${mobileMenuOpen || isActive('/profile') || isActive('/settings') ? 'text-indigo-600' : 'text-slate-500'}`}
            aria-label="Menu"
            aria-expanded={mobileMenuOpen}
          >
            <Menu size={24} strokeWidth={2} />
            <span className="text-[11px] font-medium">Plus</span>
          </button>
        </div>
      </div>

      {/* Bottom Sheet — Profil & Réglages */}
      {mobileMenuOpen && (
        <>
          <div 
            className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div 
            className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] z-[61] animate-in fade-in slide-in-from-bottom-4 duration-300"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu Profil et Réglages"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Mon compte</h2>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Fermer"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-4 min-h-[56px] px-4 rounded-xl hover:bg-slate-50 active:bg-indigo-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <User size={24} className="text-indigo-600" />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-bold text-slate-800 block">Mon profil</span>
                  <span className="text-sm text-slate-500">Identité, revenus, objectifs</span>
                </div>
              </Link>
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-4 min-h-[56px] px-4 rounded-xl hover:bg-slate-50 active:bg-indigo-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Settings size={24} className="text-slate-600" />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-bold text-slate-800 block">Réglages</span>
                  <span className="text-sm text-slate-500">Notifications, confidentialité</span>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}

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
            <span>Le QG</span>
          </Link>

          <Link href="/goals" className={getLinkClass('/goals')}>
            <Target size={20} />
            <span>Tes objectifs</span>
          </Link>

          <Link href="/simulator" className={getLinkClass('/simulator')}>
            <PlusCircle size={20} />
            <span>Simulateur achat</span>
          </Link>

          <Link href="/history" className={getLinkClass('/history')}>
            <History size={20} />
            <span>Le Rétro</span>
          </Link>

          <div className="mt-auto pt-6 border-t border-slate-100">
             <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 mt-4">Ton coin</div>
             <Link href="/profile" className={getLinkClass('/profile')}>
                <User size={20} />
                <span>Ton profil</span>
             </Link>
             <Link href="/settings" className={getLinkClass('/settings')}>
                <Settings size={20} />
                <span>Ton jardin secret</span>
             </Link>
          </div>
        </div>

        <div className="p-4">
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <p className="text-[10px] text-slate-400 font-medium">v2.0 &bull; Coach Goals</p>
          </div>
        </div>
      </div>
    </>
  );
}
