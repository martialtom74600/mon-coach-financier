'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  History,
  Calendar,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingDown,
} from 'lucide-react';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import { formatCurrency } from '@/app/lib/logic';
// 1. IMPORT NAVIGATION
import Navigation from '@/app/components/Navigation';

// --- COMPOSANTS UI ---

const Card = ({ children, className = '' }) => (
  <div
    className={`bg-white rounded-xl shadow-sm border border-slate-100 ${className}`}
  >
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '' }) => {
  const baseStyle =
    'px-4 py-3 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95';
  const variants = {
    primary:
      'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200',
    danger: 'bg-white text-rose-600 border border-rose-100 hover:bg-rose-50',
    ghost: 'bg-transparent text-slate-500 hover:text-slate-800',
  };
  return (
    <button
      onClick={onClick}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

// --- PAGE PRINCIPALE ---

export default function HistoryPage() {
  const router = useRouter();
  const { history, isLoaded } = useFinancialData();

  // Trier par date (le plus récent en premier)
  const sortedHistory = useMemo(() => {
    return [...(history || [])].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
  }, [history]);

  // Stats rapides pour la Sidebar
  const stats = useMemo(() => {
    const total = sortedHistory.length;
    const accepted = sortedHistory.filter(
      (h) => h.result.verdict === 'green'
    ).length;
    const rejected = sortedHistory.filter(
      (h) => h.result.verdict === 'red'
    ).length;
    const amountTotal = sortedHistory.reduce(
      (acc, h) => acc + parseFloat(h.purchase.amount),
      0
    );

    return { total, accepted, rejected, amountTotal };
  }, [sortedHistory]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTheme = (verdict) => {
    switch (verdict) {
      case 'green':
        return {
          icon: CheckCircle,
          color: 'text-emerald-500',
          bg: 'bg-emerald-50',
          border: 'border-emerald-100',
        };
      case 'orange':
        return {
          icon: AlertTriangle,
          color: 'text-amber-500',
          bg: 'bg-amber-50',
          border: 'border-amber-100',
        };
      case 'red':
        return {
          icon: XCircle,
          color: 'text-rose-500',
          bg: 'bg-rose-50',
          border: 'border-rose-100',
        };
      default:
        return {
          icon: History,
          color: 'text-slate-500',
          bg: 'bg-slate-50',
          border: 'border-slate-100',
        };
    }
  };

  if (!isLoaded)
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse h-12 w-12 bg-slate-200 rounded-full"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      {/* 2. NAVIGATION AJOUTÉE */}
      <Navigation />

      {/* 3. WRAPPER POUR LE CONTENU DESKTOP */}
      <div className="md:pl-64 transition-all duration-300">
        {/* HEADER */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 shadow-sm">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => router.push('/')}
                className="md:hidden text-slate-500 hover:text-slate-800 p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>

              {/* Titre centré ou aligné selon le mode */}
              <h1 className="font-bold text-slate-800 flex-1 text-center md:text-left md:pl-0">
                Historique des décisions
              </h1>

              {/* Spacer pour équilibrer le bouton retour sur mobile */}
              <div className="w-8 md:hidden"></div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 md:pt-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LISTE DES DÉCISIONS (GAUCHE) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              {sortedHistory.length === 0 ? (
                <div className="text-center py-20 opacity-50 animate-fade-in">
                  <History size={48} className="mx-auto mb-4 text-slate-300" />
                  <p>Aucune décision enregistrée pour le moment.</p>
                  <Button
                    variant="ghost"
                    onClick={() => router.push('/simulator')}
                    className="mt-2"
                  >
                    Faire une première simulation
                  </Button>
                </div>
              ) : (
                sortedHistory.map((item) => {
                  const theme = getTheme(item.result.verdict);
                  const Icon = theme.icon;

                  return (
                    <Card
                      key={item.id}
                      className={`p-5 flex flex-col sm:flex-row gap-4 sm:items-center transition-all hover:shadow-md ${theme.border} border-l-4 animate-fade-in`}
                    >
                      {/* Icone & Date */}
                      <div className="flex items-center gap-3 sm:w-1/4">
                        <div
                          className={`p-2 rounded-full ${theme.bg} ${theme.color}`}
                        >
                          <Icon size={20} />
                        </div>
                        <div className="text-xs text-slate-400 font-medium flex flex-col">
                          <span className="flex items-center gap-1">
                            <Calendar size={10} /> {formatDate(item.date)}
                          </span>
                        </div>
                      </div>

                      {/* Détails Achat */}
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-800 text-lg">
                          {item.purchase.name}
                        </h3>
                        <div className="text-sm text-slate-500">
                          {item.purchase.type === 'need'
                            ? 'Besoin'
                            : item.purchase.type === 'useful'
                            ? 'Utile'
                            : 'Envie'}{' '}
                          • Paiement:{' '}
                          {item.purchase.paymentMode === 'CASH_SAVINGS'
                            ? 'Épargne'
                            : 'Compte courant'}
                        </div>
                      </div>

                      {/* Montant */}
                      <div className="text-right">
                        <div className="font-bold text-slate-900 text-xl">
                          {formatCurrency(item.purchase.amount)}
                        </div>
                        {item.result.issues.length > 0 ? (
                          <span className="text-xs text-orange-500 font-medium">
                            {item.result.issues.length} alerte(s)
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-500 font-medium">
                            RAS
                          </span>
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>

            {/* SIDEBAR STATS (DROITE) */}
            <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-6">
              <Card className="p-6 border-indigo-100 bg-indigo-50/50">
                <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                  <TrendingDown size={20} /> Résumé
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-indigo-50">
                    <div className="text-xs text-slate-500 uppercase font-bold">
                      Total Projets
                    </div>
                    <div className="text-2xl font-bold text-slate-800">
                      {stats.total}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-indigo-50">
                    <div className="text-xs text-slate-500 uppercase font-bold">
                      Montant cumulé
                    </div>
                    <div className="text-xl font-bold text-indigo-600">
                      {formatCurrency(stats.amountTotal)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle size={14} /> Feux verts
                    </span>
                    <span className="font-bold text-slate-700">
                      {stats.accepted}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{
                        width: `${
                          stats.total > 0
                            ? (stats.accepted / stats.total) * 100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              </Card>

              {/* Bouton Clear (Optionnel, à implémenter logic.ts si besoin) */}
              {/* <Button variant="danger" className="w-full" onClick={() => alert('Fonctionnalité à venir')}>
                <Trash2 size={18} /> Effacer l'historique
            </Button> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
