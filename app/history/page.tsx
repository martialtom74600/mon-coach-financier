'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  History,
  Calendar as CalendarIcon,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingDown,
  ArrowRight,
  List
} from 'lucide-react';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import { formatCurrency, generateTimeline } from '@/app/lib/logic';

// --- IMPORTS UI KIT ---
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Badge from '@/app/components/ui/Badge';
import ProgressBar from '@/app/components/ui/ProgressBar';

// --- IMPORT NOUVEAU COMPOSANT ---
import CalendarView from '@/app/components/CalendarView';

export default function HistoryPage() {
  const router = useRouter();
  const { history, profile, isLoaded } = useFinancialData();
  
  // État pour basculer entre les vues (Défaut : Calendrier pour l'effet Wouah)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');

  // 1. Génération de la Timeline sur 2 ANS (730 jours) pour les vues long terme
  const timeline = useMemo(() => {
    if (!profile) return [];
    return generateTimeline(profile, history || [], 730); 
  }, [profile, history]);

  // 2. Tris classiques pour la vue liste
  const sortedHistory = useMemo(() => {
    return [...(history || [])].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [history]);

  // 3. Calcul des stats globales
  const stats = useMemo(() => {
    const total = sortedHistory.length;
    const accepted = sortedHistory.filter((h) => h.result.verdict === 'green').length;
    const rejected = sortedHistory.filter((h) => h.result.verdict === 'red').length;
    const amountTotal = sortedHistory.reduce((acc, h) => acc + parseFloat(h.purchase.amount), 0);
    return { total, accepted, rejected, amountTotal };
  }, [sortedHistory]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getTheme = (verdict: string) => {
    switch (verdict) {
      case 'green': return { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', badge: 'bg-emerald-100 text-emerald-700' };
      case 'orange': return { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', badge: 'bg-amber-100 text-amber-700' };
      case 'red': return { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', badge: 'bg-rose-100 text-rose-700' };
      default: return { icon: History, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-100', badge: 'bg-slate-100 text-slate-600' };
    }
  };

  if (!isLoaded) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-pulse h-12 w-12 bg-slate-200 rounded-full"></div></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in pb-12">
      
      {/* --- COLONNE GAUCHE (CONTENU PRINCIPAL) --- */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* En-tête avec Switcher de Vue */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-800">Vision Financière</h2>
            
            {/* BOUTONS DE BASCULE */}
            <div className="bg-white p-1 rounded-xl border border-slate-200 flex gap-1 self-start sm:self-auto shadow-sm">
                <button 
                    onClick={() => setViewMode('calendar')}
                    className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'calendar' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <CalendarIcon size={16} /> Calendrier
                </button>
                <button 
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <List size={16} /> Historique
                </button>
            </div>
        </div>

        {/* VUE 1 : CALENDRIER MULTI-ÉCHELLES (NOUVEAU) */}
        {viewMode === 'calendar' && (
            <CalendarView timeline={timeline} />
        )}

        {/* VUE 2 : LISTE CLASSIQUE (ANCIEN) */}
        {viewMode === 'list' && (
            <div className="space-y-4">
                {sortedHistory.length === 0 ? (
                <div className="text-center py-20 opacity-60">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><History size={32} className="text-slate-400" /></div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">C&apos;est encore vide ici</h3>
                    <p className="text-slate-500 max-w-xs mx-auto mb-8">Tes futures simulations s&apos;afficheront ici.</p>
                    <Button onClick={() => router.push('/simulator')}>Faire une simulation <ArrowRight size={18} /></Button>
                </div>
                ) : (
                sortedHistory.map((item) => {
                    const theme = getTheme(item.result.verdict);
                    const Icon = theme.icon;
                    return (
                    <Card key={item.id} className={`p-5 flex flex-col sm:flex-row gap-4 sm:items-center transition-all hover:shadow-md border-l-4 ${theme.border.replace('border', 'border-l')}`}>
                        <div className="flex items-center gap-4 sm:w-1/4">
                            <div className={`p-3 rounded-xl ${theme.bg} ${theme.color}`}><Icon size={24} /></div>
                            <div className="flex flex-col"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date</span><span className="text-sm font-bold text-slate-700 flex items-center gap-1">{formatDate(item.date)}</span></div>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-800 text-lg mb-1">{item.purchase.name}</h3>
                            <div className="flex flex-wrap gap-2">
                                <Badge color="bg-slate-100 text-slate-600">{item.purchase.type === 'need' ? 'Besoin' : item.purchase.type === 'useful' ? 'Utile' : 'Envie'}</Badge>
                                <Badge color="bg-slate-100 text-slate-600">{item.purchase.paymentMode === 'CASH_SAVINGS' ? 'Épargne' : 'Compte courant'}</Badge>
                            </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                            <div className="font-black text-slate-900 text-xl tracking-tight">{formatCurrency(item.purchase.amount)}</div>
                            {item.result.issues.length > 0 ? <Badge color={theme.badge}>{item.result.issues.length} alerte(s)</Badge> : <Badge color="bg-emerald-100 text-emerald-700">RAS - Sain</Badge>}
                        </div>
                    </Card>
                    );
                })
                )}
            </div>
        )}
      </div>

      {/* --- COLONNE DROITE (STATS) --- */}
      <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
        <Card className="p-6 border-indigo-100 bg-indigo-50/30">
          <h3 className="font-bold text-indigo-900 mb-6 flex items-center gap-2 text-lg"><TrendingDown size={20} /> Résumé Global</h3>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-50"><div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Projets</div><div className="text-3xl font-black text-slate-800">{stats.total}</div></div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-50"><div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Volume Cumulé</div><div className="text-xl font-black text-indigo-600 break-words">{formatCurrency(stats.amountTotal)}</div></div>
          </div>
          <div className="space-y-4">
            <div><div className="flex justify-between text-sm mb-2"><span className="text-emerald-700 font-bold flex items-center gap-1"><CheckCircle size={14} /> Feux verts</span><span className="font-bold text-slate-700">{stats.accepted} <span className="text-slate-400 font-normal">/ {stats.total}</span></span></div><ProgressBar value={stats.accepted} max={stats.total || 1} colorClass="bg-emerald-500" /></div>
            {stats.rejected > 0 && (<div className="pt-4 border-t border-indigo-100"><div className="flex justify-between text-sm mb-1"><span className="text-rose-700 font-bold flex items-center gap-1"><XCircle size={14} /> Projets risqués</span><span className="font-bold text-rose-600">{stats.rejected}</span></div><p className="text-xs text-slate-500 mt-1">Ces projets ont été marqués comme "Pas maintenant".</p></div>)}
          </div>
        </Card>
      </div>
    </div>
  );
}