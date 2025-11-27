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
  List,
  LayoutGrid,
  Trash2 // <-- Import poubelle
} from 'lucide-react';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import { formatCurrency, generateTimeline } from '@/app/lib/logic';

import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Badge from '@/app/components/ui/Badge';
import ProgressBar from '@/app/components/ui/ProgressBar';
import CalendarView from '@/app/components/CalendarView';

export default function HistoryPage() {
  const router = useRouter();
  // On récupère deleteDecision ici
  const { history, profile, isLoaded, deleteDecision } = useFinancialData();
  
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Timeline
  const timeline = useMemo(() => {
    if (!profile) return [];
    try {
        return generateTimeline(profile, Array.isArray(history) ? history : [], 730);
    } catch (e) {
        return [];
    }
  }, [profile, history]);

  // Tris
  const sortedHistory = useMemo(() => {
    return [...(history || [])].sort((a, b) => {
        const dateA = new Date(a.purchase?.date || a.date).getTime();
        const dateB = new Date(b.purchase?.date || b.date).getTime();
        return dateB - dateA;
    });
  }, [history]);

  // Stats
  const stats = useMemo(() => {
    const total = sortedHistory.length;
    const accepted = sortedHistory.filter((h) => h.result?.verdict === 'green').length;
    const rejected = sortedHistory.filter((h) => h.result?.verdict === 'red').length;
    const amountTotal = sortedHistory.reduce((acc, h) => acc + (parseFloat(h.purchase?.amount) || 0), 0);
    return { total, accepted, rejected, amountTotal };
  }, [sortedHistory]);

  // ACTION SUPPRESSION
  const handleDelete = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation(); // Empêche d'ouvrir la simulation en cliquant sur la poubelle
      if (window.confirm("Veux-tu vraiment supprimer cette simulation ?")) {
          setIsDeleting(id);
          try {
            await deleteDecision(id);
          } catch (error) {
            console.error("Erreur suppression", error);
          } finally {
            setIsDeleting(null);
          }
      }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
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
      
      <div className="lg:col-span-8 space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <History className="text-indigo-500" /> Vision Financière
            </h2>
            
            <div className="bg-white p-1 rounded-xl border border-slate-200 flex gap-1 self-start sm:self-auto shadow-sm">
                <button onClick={() => setViewMode('calendar')} className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'calendar' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><CalendarIcon size={16} /> Calendrier</button>
                <button onClick={() => setViewMode('list')} className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><List size={16} /> Historique</button>
            </div>
        </div>

        {viewMode === 'calendar' && (
            <CalendarView timeline={timeline} />
        )}

        {viewMode === 'list' && (
            <div className="space-y-4 animate-fade-in">
                {sortedHistory.length === 0 ? (
                <div className="text-center py-20 opacity-60 bg-white rounded-3xl border border-slate-200 border-dashed">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><LayoutGrid size={32} className="text-slate-400" /></div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">C&apos;est encore vide ici</h3>
                    <p className="text-slate-500 max-w-xs mx-auto mb-8">Tes futures simulations s&apos;afficheront ici.</p>
                    <Button onClick={() => router.push('/simulator')}>Faire une simulation <ArrowRight size={18} /></Button>
                </div>
                ) : (
                sortedHistory.map((item) => {
                    const theme = getTheme(item.result?.verdict);
                    const Icon = theme.icon;
                    const displayDate = item.purchase?.date || item.date;
                    
                    return (
                    <Card key={item.id} className={`p-5 flex flex-col sm:flex-row gap-4 sm:items-center transition-all hover:shadow-md border-l-4 ${theme.border.replace('border', 'border-l')} relative group`}>
                        
                        {/* Bouton Poubelle (Apparaît au survol) */}
                        <button 
                            onClick={(e) => handleDelete(item.id, e)}
                            className="absolute top-4 right-4 p-2 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-sm border border-slate-100"
                            title="Supprimer cette simulation"
                        >
                            {isDeleting === item.id ? <div className="animate-spin h-4 w-4 border-2 border-rose-500 border-t-transparent rounded-full"></div> : <Trash2 size={16} />}
                        </button>

                        {/* Date & Icône */}
                        <div className="flex items-center gap-4 sm:w-1/4">
                            <div className={`p-3 rounded-xl ${theme.bg} ${theme.color} shrink-0`}><Icon size={24} /></div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date</span>
                                <span className="text-sm font-bold text-slate-700">{formatDate(displayDate)}</span>
                            </div>
                        </div>

                        {/* Détails */}
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-800 text-lg mb-1">{item.purchase?.name}</h3>
                            <div className="flex flex-wrap gap-2">
                                <Badge color="bg-slate-100 text-slate-600 border border-slate-200">
                                    {item.purchase?.type === 'need' ? 'Besoin' : item.purchase?.type === 'useful' ? 'Utile' : 'Envie'}
                                </Badge>
                                <Badge color="bg-slate-100 text-slate-600 border border-slate-200">
                                    {item.purchase?.paymentMode === 'CASH_SAVINGS' ? 'Épargne' : 
                                     item.purchase?.paymentMode === 'CREDIT' ? 'Crédit' : 'Compte courant'}
                                </Badge>
                            </div>
                        </div>

                        {/* Montant & Verdict */}
                        <div className="text-right flex flex-col items-end gap-1 sm:pr-12"> {/* Padding pour laisser place à la poubelle */}
                            <div className="font-black text-slate-900 text-xl tracking-tight">
                                {formatCurrency(item.purchase?.amount)}
                            </div>
                            {item.result?.issues?.length > 0 ? (
                                <Badge color={theme.badge}>{item.result.issues.length} alerte(s)</Badge>
                            ) : (
                                <Badge color="bg-emerald-100 text-emerald-700">RAS - Sain</Badge>
                            )}
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
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-50">
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Projets</div>
                <div className="text-3xl font-black text-slate-800">{stats.total}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-50">
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Volume Cumulé</div>
                <div className="text-xl font-black text-indigo-600 break-words">{formatCurrency(stats.amountTotal)}</div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-emerald-700 font-bold flex items-center gap-1"><CheckCircle size={14} /> Feux verts</span>
                    <span className="font-bold text-slate-700">{stats.accepted} <span className="text-slate-400 font-normal">/ {stats.total}</span></span>
                </div>
                <ProgressBar value={stats.accepted} max={stats.total || 1} colorClass="bg-emerald-500" />
            </div>
            
            {stats.rejected > 0 && (
                <div className="pt-4 border-t border-indigo-100">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-rose-700 font-bold flex items-center gap-1"><XCircle size={14} /> Projets risqués</span>
                        <span className="font-bold text-rose-600">{stats.rejected}</span>
                    </div>
                    <ProgressBar value={stats.rejected} max={stats.total || 1} colorClass="bg-rose-500" />
                    <p className="text-xs text-slate-500 mt-2 italic">Ces projets ont été marqués comme &quot;Pas maintenant&quot;.</p>
                </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}