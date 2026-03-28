'use client';

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { History, Calendar as CalendarIcon, List, LayoutGrid } from 'lucide-react';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import type { PurchaseDecision } from '@/app/lib/definitions';
import { generateTimeline } from '@/app/lib/logic';
import ConfirmDialog from '@/app/components/ui/ConfirmDialog';
import PageLoader from '@/app/components/ui/PageLoader';
import { useConfirmDelete } from '@/app/hooks/useConfirmDelete';
import CalendarView from '@/app/components/CalendarView';
import { HistoryStats } from '@/app/components/history/HistoryStats';
import { HistoryItemCard } from '@/app/components/history/HistoryItemCard';
import EmptyListState from '@/app/components/ui/EmptyListState';
import ViewModeToggle from '@/app/components/ui/ViewModeToggle';
import { decisionsListResponseSchema, parseAPIResponse } from '@/app/lib/validations';

interface DecisionItem {
  id: string;
  name: string;
  amount: number;
  date: string;
  type: string;
  paymentMode: string;
  outcome?: string;
}

interface DecisionsStats {
  total: number;
  accepted: number;
  rejected: number;
  amountTotal: number;
}

function decisionToListItem(d: PurchaseDecision): DecisionItem {
  const dateRaw = d.date as Date | string;
  const date =
    typeof dateRaw === 'string'
      ? dateRaw.slice(0, 10)
      : dateRaw instanceof Date
        ? dateRaw.toISOString().slice(0, 10)
        : String(dateRaw);
  return {
    id: d.id,
    name: d.name,
    amount: Number(d.amount),
    date,
    type: String(d.type),
    paymentMode: String(d.paymentMode),
    outcome: d.outcome ? String(d.outcome) : undefined,
  };
}

export default function HistoryPage() {
  const router = useRouter();
  const { profile, isLoaded, deleteDecision, updateDecisionOutcome } = useFinancialData();
  const historyForTimeline = useMemo(() => profile?.decisions || [], [profile?.decisions]);

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [stats, setStats] = useState<DecisionsStats>({ total: 0, accepted: 0, rejected: 0, amountTotal: 0 });
  const [isLoadingDecisions, setIsLoadingDecisions] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [updatingOutcome, setUpdatingOutcome] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { state: confirmDelete, openConfirm, closeConfirm, wrapConfirm } = useConfirmDelete();

  const fetchDecisions = useCallback(async (cursor?: string) => {
    const url = cursor ? `/api/decisions?cursor=${cursor}&limit=20` : '/api/decisions?limit=20';
    const res = await fetch(url);
    if (!res.ok) return;
    const raw = await res.json();
    const validated = parseAPIResponse(decisionsListResponseSchema, raw, 'GET /api/decisions');
    if (!validated) return;
    return validated;
  }, []);

  /** Données déjà dans le profil (préchargement serveur) → liste instantanée avant la pagination API. */
  useEffect(() => {
    if (!isLoaded || !profile?.decisions?.length) return;
    setDecisions((prev) =>
      prev.length === 0 ? profile.decisions!.slice(0, 20).map(decisionToListItem) : prev,
    );
  }, [isLoaded, profile?.decisions]);

  useEffect(() => {
    if (!isLoaded) return;
    setIsLoadingDecisions(true);
    fetchDecisions().then((data) => {
      if (data) {
        setDecisions(data.decisions as DecisionItem[]);
        setNextCursor(data.nextCursor);
        setStats(data.stats);
      }
      setIsLoadingDecisions(false);
    });
  }, [isLoaded, fetchDecisions]);

  useEffect(() => {
    if (!nextCursor || isLoadingMore) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setIsLoadingMore(true);
        fetchDecisions(nextCursor).then((data) => {
          if (data) {
            setDecisions((prev) => [...prev, ...(data.decisions as DecisionItem[])]);
            setNextCursor(data.nextCursor);
            if (data.stats) setStats(data.stats);
          }
          setIsLoadingMore(false);
        });
      },
      { rootMargin: '100px', threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [nextCursor, isLoadingMore, fetchDecisions]);

  const timeline = useMemo(() => {
    if (!profile) return [];
    try {
      return generateTimeline(profile, Array.isArray(historyForTimeline) ? historyForTimeline : [], [], 730);
    } catch (e) {
      console.error('Erreur Timeline History:', e);
      return [];
    }
  }, [profile, historyForTimeline]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    openConfirm(id);
  };

  const handleConfirmDelete = wrapConfirm(async (id) => {
    const item = decisions.find((d) => d.id === id);
    setIsDeleting(id);
    setDecisions((prev) => prev.filter((d) => d.id !== id));
    if (item) {
      setStats((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        amountTotal: Math.max(0, prev.amountTotal - (item.amount || 0)),
      }));
    }
    try {
      await deleteDecision(id);
    } catch (error) {
      console.error('Erreur suppression', error);
      fetchDecisions().then((data) => {
        if (data) {
          setDecisions(data.decisions as DecisionItem[]);
          setNextCursor(data.nextCursor);
          setStats(data.stats);
        }
      });
    } finally {
      setIsDeleting(null);
    }
  });

  const handleOutcome = async (id: string, outcome: 'SATISFIED' | 'REGRETTED' | null) => {
    const item = decisions.find((d) => d.id === id);
    const prevOutcome = item?.outcome;
    setUpdatingOutcome(id);
    setDecisions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, outcome: outcome ?? undefined } : d)),
    );
    if (item) {
      setStats((prev) => {
        let accepted = prev.accepted;
        let rejected = prev.rejected;
        if (prevOutcome === 'SATISFIED') accepted--;
        if (prevOutcome === 'REGRETTED') rejected--;
        if (outcome === 'SATISFIED') accepted++;
        if (outcome === 'REGRETTED') rejected++;
        return { ...prev, accepted, rejected };
      });
    }
    try {
      await updateDecisionOutcome(id, outcome);
    } catch {
      fetchDecisions().then((data) => {
        if (data) setStats(data.stats);
      });
    } finally {
      setUpdatingOutcome(null);
    }
  };

  if (!isLoaded) return <PageLoader />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in pb-12">
      <div className="lg:col-span-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <History className="text-indigo-500" /> Ta vision
          </h2>
          <ViewModeToggle
            value={viewMode}
            onChange={(v) => setViewMode(v)}
            options={[
              { value: 'calendar', label: 'Calendrier', icon: CalendarIcon },
              { value: 'list', label: 'Rétro', icon: List },
            ]}
            className="self-start sm:self-auto"
          />
        </div>

        {viewMode === 'calendar' && <CalendarView timeline={timeline} />}

        {viewMode === 'list' && (
          <div className="space-y-4 animate-fade-in">
            {isLoadingDecisions ? (
              <PageLoader variant="compact" />
            ) : decisions.length === 0 ? (
              <EmptyListState
                icon={LayoutGrid}
                title="C'est encore vide ici"
                message="Tes prochaines simulations s'afficheront ici."
                buttonLabel="Faire une simulation"
                onAction={() => router.push('/simulator')}
              />
            ) : (
              <>
                {decisions.map((item) => (
                  <HistoryItemCard
                    key={item.id}
                    item={{
                      ...item,
                      outcome: item.outcome,
                    }}
                    isDeleting={isDeleting === item.id}
                    isUpdating={updatingOutcome === item.id}
                    onDelete={handleDelete}
                    onOutcome={handleOutcome}
                  />
                ))}
                {nextCursor && (
                  <div ref={loadMoreRef} className="flex justify-center py-4">
                    {isLoadingMore && (
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete.open}
        title="Supprimer cette simulation ?"
        message="Tu es sûr de vouloir supprimer ?"
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={closeConfirm}
      />
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
