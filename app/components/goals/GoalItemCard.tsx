'use client';

import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import { Trash2, CalendarDays } from 'lucide-react';
import { formatCurrency } from '@/app/lib/definitions';
import { GOAL_CATEGORIES } from '@/app/lib/definitions';
import type { Goal, GoalCategory } from '@/app/lib/definitions';

interface GoalItemCardProps {
  goal: Goal;
  onDelete: (id: string) => void;
}

export function GoalItemCard({ goal, onDelete }: GoalItemCardProps) {
  const catInfo =
    goal.category in GOAL_CATEGORIES
      ? GOAL_CATEGORIES[goal.category as GoalCategory]
      : { label: 'Autre', icon: '🎯' };

  return (
    <Card className="p-5 border-slate-200 bg-white group hover:border-emerald-200 transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl text-2xl flex items-center justify-center border border-emerald-100">
            {catInfo.icon}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">{goal.name}</h3>
            <div className="text-sm text-slate-500 flex items-center gap-2">
              <span>Cible : {formatCurrency(goal.targetAmount)}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CalendarDays size={12} /> {new Date(goal.deadline).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2"
          onClick={() => onDelete(goal.id)}
        >
          <Trash2 size={18} />
        </Button>
      </div>
      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-xs">
        <div className="text-slate-400 font-medium">
          Effort : <span className="text-emerald-600 font-bold">{formatCurrency(goal.monthlyContribution)} / mois</span>
          {goal.transferDay && (
            <span className="text-slate-400 ml-2">(Virement le {goal.transferDay})</span>
          )}
        </div>
        <div className="text-slate-400">
          {goal.currentSaved > 0 && (
            <span className="text-slate-500">Déjà {formatCurrency(goal.currentSaved)} de côté</span>
          )}
        </div>
      </div>
    </Card>
  );
}
