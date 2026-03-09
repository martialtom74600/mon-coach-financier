'use client';

import { useState, useEffect } from 'react';
import { Flag, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import Button from '@/app/components/ui/Button';
import { WizardLayout } from '../ProfileWizardLayout';
import { formatCurrency } from '@/app/lib/definitions';
import { getInputValue, parseNumber } from '../ProfileWizard.mappers';
import type { StepProps } from '../ProfileWizard.types';

export function StepStrategy({ formData, onConfirm, isSaving, onPrev, stats }: StepProps) {
  const [lifestyleInput, setLifestyleInput] = useState<string | number>('');

  useEffect(() => {
    if (formData.funBudget) setLifestyleInput(formData.funBudget);
  }, [formData.funBudget]);

  const theoreticalRest = stats ? Math.round(stats.remaining) : 0;
  const userLifestyle = parseNumber(lifestyleInput);
  const cashSavingsCapacity = theoreticalRest - userLifestyle;

  return (
    <WizardLayout
      title="Le Verdict"
      subtitle="C'est le moment de vérité."
      icon={Flag}
      footer={
        <>
          <Button variant="ghost" onClick={onPrev}>
            Retour
          </Button>
          <Button
            onClick={() => onConfirm!(userLifestyle, cashSavingsCapacity)}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
            size="lg"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : 'Valider ma stratégie'}
          </Button>
        </>
      }
    >
      <div className="space-y-8 animate-in zoom-in-95 duration-500">
        <div className="text-center p-6 bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-200">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-2">
            Disponible après TOUTES charges
          </p>
          <div className="text-4xl md:text-5xl font-black text-white tracking-tight">
            {formatCurrency(theoreticalRest)}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            C&apos;est votre argent pour le &quot;Plaisir&quot;.
          </p>
        </div>
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2 text-sm text-slate-500 font-medium">Répartition</span>
          </div>
        </div>
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 hover:border-indigo-200 transition-colors duration-300">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Budget Plaisir Pur
              </label>
              <div className="relative">
                <input
                  type="number"
                  className="block w-full rounded-xl border-slate-200 bg-slate-50 p-4 pr-12 text-2xl font-bold text-slate-900 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="0"
                  value={lifestyleInput}
                  onChange={(e) => setLifestyleInput(getInputValue(e) as string)}
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                  <span className="text-slate-400 font-bold">€</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Resto, sorties, vacances, shopping...
              </p>
            </div>
            <div className="hidden md:block text-slate-300">
              <ArrowRight size={32} />
            </div>
            <div className="flex-1 w-full text-center md:text-right">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">
                Épargne de Sécurité
              </p>
              <div
                className={`text-3xl font-black ${cashSavingsCapacity > 0 ? 'text-emerald-600' : 'text-rose-500'}`}
              >
                {cashSavingsCapacity > 0 ? '+' : ''}
                {formatCurrency(cashSavingsCapacity)}
              </div>
              <p className="text-xs text-slate-400 mt-1">Cash disponible à la fin du mois</p>
            </div>
          </div>
          {cashSavingsCapacity < 0 && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-3 text-rose-700 text-sm font-medium animate-pulse">
              <AlertCircle size={20} />
              Attention, votre train de vie dépasse vos revenus disponibles.
            </div>
          )}
        </div>
      </div>
    </WizardLayout>
  );
}
