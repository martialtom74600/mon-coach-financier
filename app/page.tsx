'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import { calculateFinancials, formatCurrency } from '@/app/lib/logic';

import {
  Wallet,
  Shield,
  User,
  TrendingUp,
  History,
} from 'lucide-react';

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, className = '' }) => {
  const isWhite = className.includes('bg-white');
  const baseStyle =
    'px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95';
  const colorStyle = isWhite
    ? 'text-indigo-700 hover:bg-indigo-50'
    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200';

  return (
    <button onClick={onClick} className={`${baseStyle} ${colorStyle} ${className}`}>
      {children}
    </button>
  );
};

export default function DashboardPage() {
  const { profile, isLoaded } = useFinancialData();
  const router = useRouter();

  const stats = useMemo(() => calculateFinancials(profile), [profile]);

  if (!isLoaded)
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-16 w-16 bg-indigo-100 rounded-full"></div>
          <div className="h-4 w-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );

  const hasProfile = profile.incomes && profile.incomes.length > 0;

  // Note : On ne met plus de container ici, le Layout s'en charge.
  
  if (!hasProfile) {
    return (
      /* --- MODE ONBOARDING --- */
      <div className="flex flex-col justify-center items-center min-h-[60vh] animate-fade-in">
        <Card className="max-w-2xl w-full p-8 md:p-12 text-center shadow-xl border border-slate-100 bg-white/80 backdrop-blur-sm">
          <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 mx-auto ring-8 ring-indigo-50/50">
            <Shield className="w-12 h-12 text-indigo-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">
            Coach d&apos;achats
          </h1>
          <p className="text-slate-600 text-lg max-w-lg mx-auto mb-8 leading-relaxed">
            Pour que je puisse t&apos;aider, j&apos;ai besoin de comprendre ta
            situation financière.
            <br className="hidden md:block" />
            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium mt-2 inline-block">
              5 minutes
            </span>{' '}
            pour configurer ton profil et tester n&apos;importe quel achat.
          </p>
          <div className="flex justify-center">
            <Button
              onClick={() => router.push('/profile')}
              className="w-full md:w-auto md:px-12 py-4 text-lg"
            >
              Créer mon profil maintenant
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    /* --- MODE DASHBOARD --- */
    <div className="space-y-8 animate-fade-in">
      {/* Pas de Header ici, il est dans le Layout */}

      {/* Grille Principale */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Colonne Gauche */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Hero Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white p-8 shadow-lg shadow-indigo-200 transition-transform duration-300 hover:scale-[1.01]">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-40 h-40 bg-indigo-400 opacity-20 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">
                    Envie d&apos;un nouvel achat ?
                  </h2>
                  <p className="text-indigo-100 max-w-md text-sm md:text-base leading-relaxed opacity-90">
                    Je t&apos;aide à décider. Entre le prix, ta sécurité et
                    tes objectifs, découvre si c&apos;est une bonne idée tout
                    de suite.
                  </p>
                </div>
                <Button
                  onClick={() => router.push('/simulator')}
                  className="w-full md:w-auto whitespace-nowrap bg-white text-indigo-700 font-bold"
                >
                  Tester un achat
                </Button>
              </div>
            </div>
          </div>

          {/* Cartes Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <Card className="p-6 border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-5 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
                <Wallet size={64} />
              </div>
              <div className="flex items-center gap-2 mb-3 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <Wallet size={16} className="text-indigo-500" />
                Reste à vivre
              </div>
              <div className="flex items-baseline gap-1 relative z-10">
                <span className="text-3xl font-bold text-slate-800">
                  {formatCurrency(stats.remainingToLive)}
                </span>
              </div>
              <div className="mt-2 text-sm text-slate-400 flex items-center gap-1 relative z-10">
                <div
                  className={`w-2 h-2 rounded-full ${
                    stats.remainingToLive > 0
                      ? 'bg-emerald-400'
                      : 'bg-red-400'
                  }`}
                ></div>
                Disponible / mois
              </div>
            </Card>

            <Card className="p-6 border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-5 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
                <Shield size={64} />
              </div>
              <div className="flex items-center gap-2 mb-3 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <Shield
                  size={16}
                  className={
                    stats.safetyMonths < 3
                      ? 'text-orange-500'
                      : 'text-emerald-500'
                  }
                />
                Sécurité
              </div>
              <div
                className={`text-3xl font-bold relative z-10 ${
                  stats.safetyMonths < 3
                    ? 'text-orange-500'
                    : 'text-emerald-600'
                }`}
              >
                {stats.safetyMonths.toFixed(1)}{' '}
                <span className="text-xl font-normal text-slate-400">
                  mois
                </span>
              </div>
              <div className="mt-2 text-sm text-slate-400 relative z-10">
                Soit <strong>{formatCurrency(stats.matelas)}</strong> de
                côté
              </div>
            </Card>
          </div>
        </div>

        {/* Colonne Droite (Info) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <div className="sticky top-6">
            <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-sm">
              <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-indigo-600" />
                Comment ça marche ?
              </h3>
              <div className="space-y-6 relative">
                <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-indigo-100 via-slate-100 to-transparent"></div>
                {[
                  {
                    id: 1,
                    text: 'Tu as configuré ton profil financier.',
                  },
                  {
                    id: 2,
                    text: 'Tu saisis un achat que tu as envie de faire.',
                  },
                  {
                    id: 3,
                    text: "Je calcule l'impact sur ta sécurité financière.",
                  },
                ].map((step) => (
                  <div
                    key={step.id}
                    className="flex gap-4 relative items-start group"
                  >
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-indigo-100 text-indigo-600 flex items-center justify-center z-10 text-sm font-bold shrink-0 group-hover:border-indigo-500 group-hover:bg-indigo-50 transition-colors">
                      {step.id}
                    </div>
                    <p className="text-slate-600 pt-1 text-sm md:text-base group-hover:text-slate-900 transition-colors">
                      {step.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}