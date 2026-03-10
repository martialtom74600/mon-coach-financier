'use client';

import Card from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import { Wallet, Target, Landmark, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '@/app/lib/definitions';

interface GoalBudgetSidebarProps {
  monthlyIncome: number;
  capacityToSave: number;
  securityBuffer: number;
  matelas: number;
  totalGoalsEffort: number;
  displayedGoalsEffort: number;
  displayedRemaining: number;
  isBudgetNegative: boolean;
}

export function GoalBudgetSidebar({
  monthlyIncome,
  capacityToSave,
  securityBuffer,
  matelas,
  displayedGoalsEffort,
  displayedRemaining,
  isBudgetNegative,
}: GoalBudgetSidebarProps) {
  return (
    <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-6">
      <Card className="p-6 bg-white border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Wallet size={20} className="text-slate-400" /> Mon Budget
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-500 text-sm font-medium">Revenus Net</span>
            <span className="font-bold text-slate-700">{formatCurrency(monthlyIncome)}</span>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-emerald-900 text-sm font-bold block">Capacité d&apos;épargne</span>
                <span className="text-[10px] text-emerald-600/70 uppercase font-bold tracking-wider">
                  Le carburant
                </span>
              </div>
              <span className="font-bold text-emerald-700 text-xl">{formatCurrency(capacityToSave)}</span>
            </div>
            {securityBuffer > 0 && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 pt-2 border-t border-emerald-100">
                <ShieldCheck size={12} />
                Dont <span className="font-bold">{formatCurrency(securityBuffer)}</span> réservés pour la
                sécurité
              </div>
            )}
          </div>

          {matelas > 0 && (
            <div className="flex justify-between items-center p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
              <div>
                <span className="text-indigo-900 text-sm font-bold block">Épargne dispo</span>
                <span className="text-[10px] text-indigo-600/70 uppercase font-bold tracking-wider">
                  Le stock
                </span>
              </div>
              <span className="font-bold text-indigo-700">{formatCurrency(matelas)}</span>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6 border-indigo-100 shadow-md bg-white relative overflow-hidden">
        <div
          className={`absolute top-0 left-0 w-1 h-full ${isBudgetNegative ? 'bg-rose-500' : 'bg-emerald-500'}`}
        ></div>
        <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
          <Landmark size={20} /> Impact Mensuel
        </h3>
        <div className="space-y-4">
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase mb-1">
              Effort actuel pour projets
            </div>
            <div className="flex justify-between items-end">
              <div className="font-bold text-slate-800 text-2xl">
                {formatCurrency(displayedGoalsEffort)}
              </div>
              <Badge
                color={isBudgetNegative ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}
              >
                / mois
              </Badge>
            </div>
          </div>
          <div className="h-px bg-slate-100"></div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase mb-1">Marge restante</div>
            <div className={`font-bold text-xl ${isBudgetNegative ? 'text-rose-600' : 'text-slate-600'}`}>
              {formatCurrency(displayedRemaining)}
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-snug">
              {isBudgetNegative
                ? 'Tes projets coûtent plus que ce que tu peux épargner.'
                : 'Tu finances tes projets et tu gardes une marge. Bien joué.'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
