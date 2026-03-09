'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { History, Calendar as CalendarIcon, List, LayoutGrid, ArrowRight } from 'lucide-react';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import { generateTimeline } from '@/app/lib/logic';
import Button from '@/app/components/ui/Button';
import CalendarView from '@/app/components/CalendarView';
import { HistoryStats } from '@/app/components/history/HistoryStats';
import { HistoryItemCard } from '@/app/components/history/HistoryItemCard';

export default function HistoryPage() {
  const router = useRouter();
  const { profile, isLoaded, deleteDecision, updateDecisionOutcome } = useFinancialData();
  const history = useMemo(() => profile?.decisions || [], [profile?.decisions]);

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [updatingOutcome, setUpdatingOutcome] = useState<string | null>(null);

  const timeline = useMemo(() => {
    if (!profile) return [];
    try {
      return generateTimeline(profile, Array.isArray(history) ? history : [], [], 730);
    } catch (e) {
      console.error('Erreur Timeline History:', e);
      return [];
    }
  }, [profile, history]);

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
  }, [history]);

  const stats = useMemo(() => {
    const total = sortedHistory.length;
    const amountTotal = sortedHistory.reduce((acc, h) => acc + (h.amount || 0), 0);
    const accepted = sortedHistory.filter((h) => (h as { outcome?: string }).outcome === 'SATISFIED').length;
    const rejected = sortedHistory.filter((h) => (h as { outcome?: string }).outcome === 'REGRETTED').length;
    return { total, accepted, rejected, amountTotal };
  }, [sortedHistory]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Veux-tu vraiment supprimer cette simulation ?')) {
      setIsDeleting(id);
      try {
        await deleteDecision(id);
      } catch (error) {
        console.error('Erreur suppression', error);
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const handleOutcome = async (id: string, outcome: 'SATISFIED' | 'REGRETTED' | null) => {
    setUpdatingOutcome(id);
    try {
      await updateDecisionOutcome(id, outcome);
    } finally {
      setUpdatingOutcome(null);
    }
  };

  if (!isLoaded)
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-pulse h-12 w-12 bg-slate-200 rounded-full"></div>
      </div>
    );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in pb-12">
      <div className="lg:col-span-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <History className="text-indigo-500" /> Vision Financière
          </h2>
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

        {viewMode === 'calendar' && <CalendarView timeline={timeline} />}

        {viewMode === 'list' && (
          <div className="space-y-4 animate-fade-in">
            {sortedHistory.length === 0 ? (
              <div className="text-center py-20 opacity-60 bg-white rounded-3xl border border-slate-200 border-dashed">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <LayoutGrid size={32} className="text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{"C'est encore vide ici"}</h3>
                <p className="text-slate-500 max-w-xs mx-auto mb-8">
                  {"Tes futures simulations s'afficheront ici."}
                </p>
                <Button onClick={() => router.push('/simulator')}>
                  Faire une simulation <ArrowRight size={18} />
                </Button>
              </div>
            ) : (
              sortedHistory.map((item) => (
                <HistoryItemCard
                  key={item.id}
                  item={{
                    ...item,
                    outcome: (item as { outcome?: string }).outcome,
                  }}
                  isDeleting={isDeleting === item.id}
                  isUpdating={updatingOutcome === item.id}
                  onDelete={handleDelete}
                  onOutcome={handleOutcome}
                />
              ))
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
        <HistoryStats
          total={stats.total}
          accepted={stats.accepted}
          rejected={stats.rejected}
          amountTotal={stats.amountTotal}
        />
      </div>
    </div>
  );
}
