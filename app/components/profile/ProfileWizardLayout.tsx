'use client';

import React from 'react';
import Card from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import Button from '@/app/components/ui/Button';
import { Minus, Plus, CheckCircle, ArrowRight, User, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/app/lib/definitions';
import { UserPersona } from '@/app/lib/definitions';
import type {
  WizardLayoutProps,
  SelectionTileProps,
  CounterControlProps,
  LiveSummaryProps,
  FormProfile,
} from './ProfileWizard.types';

export const WizardLayout = ({ title, subtitle, icon: Icon, children, footer, error, compact }: WizardLayoutProps) => (
  <div className={`w-full max-w-2xl mx-auto lg:mx-0 ${compact ? '' : 'animate-in fade-in slide-in-from-bottom-4 duration-500'}`}>
    {!compact && (
      <div className="text-center lg:text-left mb-8">
        <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-4">
          <Icon size={28} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">{title}</h1>
        <p className="text-slate-500 text-lg max-w-md mx-auto lg:mx-0">{subtitle}</p>
      </div>
    )}
    {compact ? (
      <div>
        {children}
        {error && (
          <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-sm font-bold">
            <AlertTriangle className="shrink-0 mt-0.5" size={20} />
            {error}
          </div>
        )}
        {footer && (
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">{footer}</div>
        )}
      </div>
    ) : (
      <Card className="p-6 md:p-10 shadow-xl shadow-slate-200/40 border-slate-100">
        {children}
        {error && (
          <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 animate-in slide-in-from-top-2">
            <AlertTriangle className="shrink-0 mt-0.5" size={20} />
            <div className="text-sm font-bold">{error}</div>
          </div>
        )}
        {footer && (
          <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between gap-4">{footer}</div>
        )}
      </Card>
    )}
  </div>
);

export const SelectionTile = ({ selected, onClick, icon: Icon, title, desc }: SelectionTileProps) => (
  <div
    onClick={onClick}
    role="button"
    className={`cursor-pointer relative p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 text-left ${selected ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
  >
    <div className={`p-2.5 rounded-lg ${selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
      <Icon size={20} />
    </div>
    <div className="flex-1">
      <h3 className={`font-bold text-sm ${selected ? 'text-indigo-900' : 'text-slate-900'}`}>{title}</h3>
      <p className="text-xs text-slate-500">{desc}</p>
    </div>
    {selected && <CheckCircle className="text-indigo-600" size={18} />}
  </div>
);

export const CounterControl = ({ label, value, onChange }: CounterControlProps) => (
  <div className="flex flex-col items-center w-full p-4 border border-slate-100 rounded-xl bg-slate-50/50">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{label}</span>
    <div className="flex items-center gap-4">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="h-8 w-8 rounded-full p-0 flex items-center justify-center"
      >
        <Minus size={14} />
      </Button>
      <span className="text-2xl font-black text-slate-800 w-8 text-center">{value}</span>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(value + 1)}
        className="h-8 w-8 rounded-full p-0 flex items-center justify-center"
      >
        <Plus size={14} />
      </Button>
    </div>
  </div>
);

export const LiveSummary = ({ formData, stats, currentStep }: LiveSummaryProps) => {
  const { income = 0, fixed = 0, variable = 0, investments = 0, ratio = 0, remaining = 0 } = stats || {};
  const ratioColor = ratio > 60 ? 'bg-orange-500' : ratio > 40 ? 'bg-yellow-500' : 'bg-emerald-500';
  const badgeColor =
    ratio > 60
      ? 'text-orange-600 border-orange-200 bg-orange-50'
      : ratio > 40
        ? 'text-yellow-600 border-yellow-200 bg-yellow-50'
        : 'text-emerald-600 border-emerald-200 bg-emerald-50';

  return (
    <div className="sticky top-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
      <Card className="p-6 border-indigo-100 shadow-lg shadow-indigo-100/50 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-3 opacity-10">
          <User size={64} />
        </div>
        <div className="relative z-10">
          <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">Ton profil</h3>
          <div className="text-2xl font-black text-slate-800 truncate">{formData.firstName || 'Invité'}</div>
          <div className="flex flex-wrap gap-2 mt-3">
            {formData.age && (
              <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                {formData.age} ans
              </Badge>
            )}
            {formData.persona && (
              <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 capitalize">
                {formData.persona === UserPersona.SALARIED
                  ? 'Salarié'
                  : formData.persona === UserPersona.FREELANCE
                    ? 'Indépendant'
                    : formData.persona === UserPersona.STUDENT
                      ? 'Étudiant'
                      : 'Retraité'}
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {(currentStep >= 3 || income > 0) && (
        <Card className="p-6 border-slate-200 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Synthèse du mois</h3>
            <Badge variant="outline" className={badgeColor}>
              {Math.round(ratio)}% Engagés
            </Badge>
          </div>
          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex mb-6">
            <div
              style={{ width: `${Math.min(ratio, 100)}%` }}
              className={`h-full ${ratioColor} transition-all duration-500`}
            />
            <div className="h-full bg-indigo-500 flex-1 transition-all duration-500" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-300" /> Revenus
              </span>
              <span className="font-bold text-slate-900">{formatCurrency(income)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-400" /> Charges fixes
              </span>
              <span className="font-bold text-slate-900 text-rose-600">-{formatCurrency(fixed)}</span>
            </div>
            {variable > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-400" /> Quotidien
                </span>
                <span className="font-bold text-slate-700">-{formatCurrency(variable)}</span>
              </div>
            )}
            {investments > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" /> Investissements
                </span>
                <span className="font-bold text-emerald-600">-{formatCurrency(investments)}</span>
              </div>
            )}
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center mt-3">
              <span className="font-bold text-slate-700 uppercase text-xs">Vrai Reste à vivre</span>
              <span className="font-black text-xl text-indigo-600">{formatCurrency(remaining)}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
