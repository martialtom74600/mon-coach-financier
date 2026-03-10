'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, TrendingDown, Trophy, X } from 'lucide-react';
import GlassCard from '@/app/components/ui/GlassCard';
import type { ActionGuide } from '@/app/lib/definitions';

export interface StoredInsight {
  id: string;
  insightId: string;
  type: string;
  severity: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  readAt: string | null;
}

interface ProactiveInsightsCardProps {
  insights: StoredInsight[];
  onDismiss: (id: string) => void;
  onOpenGuide?: (guide: ActionGuide) => void;
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; icon: string; Icon: typeof AlertTriangle }> = {
  critical: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    icon: 'text-rose-600',
    Icon: AlertTriangle,
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-600',
    Icon: AlertTriangle,
  },
  info: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    icon: 'text-slate-600',
    Icon: TrendingDown,
  },
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: 'text-emerald-600',
    Icon: Trophy,
  },
};

const SNOOZE_SECONDS = (() => {
  const val = process.env.NEXT_PUBLIC_INSIGHT_SNOOZE_SECONDS;
  if (!val) return 7 * 24 * 60 * 60;
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : 7 * 24 * 60 * 60;
})();

function getSnoozeLabel(): string {
  if (SNOOZE_SECONDS <= 60) return `réapparaît dans ${SNOOZE_SECONDS} secondes`;
  if (SNOOZE_SECONDS < 3600) return `réapparaît dans ${Math.round(SNOOZE_SECONDS / 60)} min`;
  const d = new Date();
  d.setSeconds(d.getSeconds() + SNOOZE_SECONDS);
  return `réapparaît le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
}

export default function ProactiveInsightsCard({ insights, onDismiss, onOpenGuide }: ProactiveInsightsCardProps) {
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const router = useRouter();
  const snoozeTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = snoozeTimersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const handleDismiss = async (id: string) => {
    setDismissing((prev) => new Set(prev).add(id));
    try {
      await fetch(`/api/insights/${id}`, { method: 'PATCH' });
    } finally {
      onDismiss(id);
      setDismissing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (SNOOZE_SECONDS <= 300) {
        const timer = setTimeout(() => {
          snoozeTimersRef.current.delete(id);
          router.refresh();
        }, SNOOZE_SECONDS * 1000);
        snoozeTimersRef.current.set(id, timer);
      }
    }
  };

  if (insights.length === 0) return null;

  const snoozeLabel = getSnoozeLabel();
  const durationLabel =
    SNOOZE_SECONDS <= 60
      ? `${SNOOZE_SECONDS} secondes`
      : SNOOZE_SECONDS < 3600
        ? `${Math.round(SNOOZE_SECONDS / 60)} min`
        : SNOOZE_SECONDS < 86400
          ? `${Math.round(SNOOZE_SECONDS / 3600)} h`
          : `${Math.round(SNOOZE_SECONDS / 86400)} jours`;

  return (
    <GlassCard className="border-l-4 border-l-indigo-400">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Alertes & Pépites
        </h3>
        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
          {insights.length} alerte{insights.length > 1 ? 's' : ''}
        </span>
      </div>
      <p className="text-[11px] text-slate-400 mb-3">
        Clique sur × pour masquer — {snoozeLabel}
      </p>
      <div className="space-y-3">
        {insights.map((insight) => {
          const style = SEVERITY_STYLES[insight.severity] ?? SEVERITY_STYLES.info;
          const { Icon } = style;
          const guide = insight.metadata?.guide as ActionGuide | undefined;
          const isClickable = !!guide && !!onOpenGuide;
          return (
            <div
              key={insight.id}
              className={`flex items-start gap-3 p-3 rounded-xl ${style.bg} ${style.border} border ${isClickable ? 'cursor-pointer hover:opacity-90' : ''}`}
              onClick={isClickable ? () => onOpenGuide(guide) : undefined}
              role={isClickable ? 'button' : undefined}
            >
              <div className={`p-2 rounded-lg shrink-0 ${style.icon}`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 leading-snug">{insight.message}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(insight.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDismiss(insight.id); }}
                disabled={dismissing.has(insight.id)}
                className="p-1.5 rounded-lg hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50 shrink-0"
                aria-label="Masquer"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
