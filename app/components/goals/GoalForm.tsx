'use client';

import InputGroup from '@/app/components/ui/InputGroup';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import { PiggyBank, TrendingUp, ArrowRight, CheckCircle } from 'lucide-react';
import { GOAL_CATEGORIES } from '@/app/lib/definitions';
import type { GoalCategory } from '@/app/lib/definitions';

export interface GoalFormData {
  name: string;
  category: string;
  targetAmount: string;
  currentSaved: string;
  deadline: string;
  projectedYield: string;
  transferDay: string;
}

interface ContextToggleProps {
  label: string;
  subLabel: string;
  icon: React.ComponentType<{ size?: number | string }>;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ContextToggle = ({ label, subLabel, icon: Icon, checked, onChange }: ContextToggleProps) => (
  <label
    className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all duration-200 ${checked ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
  >
    <div
      className={`p-2 rounded-lg ${checked ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}
    >
      <Icon size={20} />
    </div>
    <div className="flex-1">
      <div className={`font-bold text-sm ${checked ? 'text-emerald-900' : 'text-slate-700'}`}>{label}</div>
      <div className="text-xs text-slate-500 mt-0.5">{subLabel}</div>
    </div>
    <div
      className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${checked ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-300'}`}
    >
      {checked && <CheckCircle size={14} className="text-white" />}
    </div>
    <input
      type="checkbox"
      className="hidden"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
  </label>
);

interface GoalFormProps {
  formData: GoalFormData;
  setFormData: React.Dispatch<React.SetStateAction<GoalFormData>>;
  hasSavings: boolean;
  setHasSavings: (v: boolean) => void;
  isInvested: boolean;
  setIsInvested: (v: boolean) => void;
  onSimulate: () => void;
  hasGoals: boolean;
  onBackToList?: () => void;
}

export function GoalForm({
  formData,
  setFormData,
  hasSavings,
  setHasSavings,
  isInvested,
  setIsInvested,
  onSimulate,
  hasGoals,
  onBackToList,
}: GoalFormProps) {
  return (
    <div className="animate-fade-in space-y-4">
      {hasGoals && onBackToList && (
        <button
          onClick={onBackToList}
          className="text-slate-500 flex items-center gap-1 text-sm font-medium hover:text-emerald-600 transition-colors"
        >
          ← Retour à la liste
        </button>
      )}
      <Card className="p-6 md:p-8 border-emerald-100 shadow-md">
        <div className="space-y-6">
          <InputGroup
            label="Nom du projet"
            placeholder="Ex: Apport Maison..."
            value={formData.name}
            onChange={(v: string) => setFormData({ ...formData, name: v })}
          />

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Type de projet</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.values(GOAL_CATEGORIES).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFormData({ ...formData, category: cat.id })}
                  className={`p-2 rounded-lg text-xs font-medium border transition-all text-center hover:scale-105 ${formData.category === cat.id ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}
                >
                  <div className="text-lg mb-1">{cat.icon}</div>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputGroup
              label="Montant Cible"
              type="number"
              suffix="€"
              value={formData.targetAmount}
              onChange={(v: string) => setFormData({ ...formData, targetAmount: v })}
            />
            <InputGroup
              label="Date butoir"
              type="date"
              value={formData.deadline}
              onChange={(v: string) => setFormData({ ...formData, deadline: v })}
            />
          </div>

          <div className="pt-2 space-y-3">
            <label className="block text-sm font-medium text-slate-600">Paramètres avancés</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ContextToggle
                label="Apport initial"
                subLabel="J'ai déjà une somme"
                icon={PiggyBank}
                checked={hasSavings}
                onChange={setHasSavings}
              />
              <ContextToggle
                label="Investissement"
                subLabel="Placé avec rendement"
                icon={TrendingUp}
                checked={isInvested}
                onChange={setIsInvested}
              />
            </div>
            {(hasSavings || isInvested) && (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-4">
                {hasSavings && (
                  <InputGroup
                    label="Montant déjà épargné"
                    type="number"
                    suffix="€"
                    value={formData.currentSaved}
                    onChange={(v: string) => setFormData({ ...formData, currentSaved: v })}
                  />
                )}
                {isInvested && (
                  <InputGroup
                    label="Rendement annuel estimé"
                    type="number"
                    suffix="%"
                    placeholder="4"
                    value={formData.projectedYield}
                    onChange={(v: string) => setFormData({ ...formData, projectedYield: v })}
                  />
                )}
              </div>
            )}
          </div>

          <div className="pt-4">
            <Button
              onClick={onSimulate}
              className="w-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2"
              disabled={!formData.targetAmount || !formData.name || !formData.deadline}
            >
              Simuler ce projet <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
