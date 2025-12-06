'use client';

import React, { useState } from 'react';
import { 
  Target, Calendar, AlertTriangle, 
  CheckCircle, ArrowRight, PiggyBank, Clock, Trash2, Loader2
} from 'lucide-react';
import { useGoalManager } from '@/app/hooks/useGoalManager';
import Card from '@/app/components/ui/Card';

interface GoalCardProps {
  goal: Goal;
  onDelete: (id: string) => void; // <--- Nouvelle prop
}

export default function GoalCard({ goal, onDelete }: GoalCardProps) {
  const { applyStrategy } = useGoalManager();
  const [isApplying, setIsApplying] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sécurité
  if (!goal.diagnosis) return null;

  const { status, mainMessage, strategies, color } = goal.diagnosis;
  
  const current = typeof goal.currentSaved === 'string' ? parseFloat(goal.currentSaved) : goal.currentSaved;
  const target = typeof goal.targetAmount === 'string' ? parseFloat(goal.targetAmount) : goal.targetAmount;
  const percent = Math.min(100, Math.max(0, (current / target) * 100));

  const theme = {
    green: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500', icon: CheckCircle },
    red: { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-700', bar: 'bg-rose-500', icon: AlertTriangle },
    orange: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', bar: 'bg-amber-500', icon: AlertTriangle },
    black: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', bar: 'bg-slate-500', icon: AlertTriangle },
  }[color] || { bg: 'bg-slate-50', border: 'border-slate-100', text: 'text-slate-700', bar: 'bg-slate-400', icon: Target };

  const StatusIcon = theme.icon;

  const handleAction = async (strategy: GoalStrategy) => {
    setIsApplying(strategy.type);
    await applyStrategy(goal.id, strategy);
    setIsApplying(null);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Supprimer définitivement cet objectif ?")) {
        setIsDeleting(true);
        onDelete(goal.id);
    }
  };

  return (
    <Card className={`p-5 border-l-4 ${theme.border.replace('border', 'border-l')} transition-all hover:shadow-md relative group`}>
      
      {/* BOUTON SUPPRESSION (Visible au survol ou mobile) */}
      <button 
        onClick={handleDeleteClick}
        disabled={isDeleting}
        className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
        title="Supprimer"
      >
        {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
      </button>

      {/* 1. EN-TÊTE */}
      <div className="flex justify-between items-start mb-4 pr-8"> {/* pr-8 pour laisser place à la poubelle */}
        <div className="flex items-center gap-3">
          <div className={`p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 ${theme.text}`}>
            <Target size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg leading-tight">{goal.name}</h3>
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
              <Calendar size={12} /> 
              {new Date(goal.deadline).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <div className={`font-black text-lg ${theme.text}`}>{formatCurrency(current)}</div>
          <div className="text-xs text-slate-400 font-medium">sur {formatCurrency(target)}</div>
        </div>
      </div>

      {/* 2. BARRE */}
      <div className="flex justify-between text-xs mb-1 sm:hidden">
         <span className="font-bold text-slate-700">{formatCurrency(current)}</span>
         <span className="text-slate-400">/ {formatCurrency(target)}</span>
      </div>
      <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div className={`absolute top-0 left-0 h-full ${theme.bar} transition-all duration-1000 ease-out`} style={{ width: `${percent}%` }}></div>
      </div>

      {/* 3. DIAGNOSTIC */}
      <div className={`flex items-start gap-3 mb-4 p-3 rounded-xl ${theme.bg}`}>
        <StatusIcon className={`${theme.text} mt-0.5 shrink-0`} size={18} />
        <div className="flex-1">
          <div className={`text-sm font-bold ${theme.text} mb-0.5`}>
            {status === 'DONE' ? 'Objectif atteint !' : 
             status === 'POSSIBLE' ? `Épargne requise : ${Math.round(goal.monthlyNeed || 0)}€ / mois` : 
             'Attention : Objectif difficile'}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed opacity-90">{mainMessage}</p>
        </div>
      </div>

      {/* 4. SOLUTIONS */}
      {strategies.length > 0 && (
        <div className="mt-4 space-y-2 pt-4 border-t border-slate-100">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Stratégies recommandées</div>
          {strategies.map((strat, i) => (
            <button
              key={i}
              onClick={() => handleAction(strat)}
              disabled={!!isApplying || strat.disabled}
              className={`w-full bg-white border border-slate-200 p-3 rounded-xl text-left transition-all group/btn relative overflow-hidden ${strat.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-300 hover:shadow-sm'}`}
            >
              {isApplying === strat.type && (
                <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10"><div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full"></div></div>
              )}
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${strat.type === 'TIME' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                  {strat.type === 'TIME' ? <Clock size={18} /> : <PiggyBank size={18} />}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-700 text-sm flex justify-between items-center">
                    {strat.title}
                    {!strat.disabled && <span className="text-indigo-600 text-xs flex items-center gap-1 opacity-0 group-hover/btn:opacity-100 transition-opacity bg-indigo-50 px-2 py-1 rounded-full">{strat.actionLabel || 'Appliquer'} <ArrowRight size={12} /></span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{strat.message}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}