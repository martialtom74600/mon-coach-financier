'use client';

import { Wallet, Home, CreditCard, Zap, Calendar, AlertCircle, ArrowRight, Banknote } from 'lucide-react';
import Button from '@/app/components/ui/Button';
import InputGroup from '@/app/components/ui/InputGroup';
import AccordionSection from '@/app/components/AccordionSection';
import { WizardLayout } from '../ProfileWizardLayout';
import { HousingStatus } from '@/app/lib/definitions';
import { parseNumber } from '../ProfileWizard.mappers';
import type { StepProps } from '../ProfileWizard.types';

export function StepFixedCosts({
  formData,
  updateForm,
  addItem,
  removeItem,
  updateItem,
  onNext,
  onPrev,
  error,
}: StepProps) {
  return (
    <WizardLayout
      title="Revenus & Charges Fixes"
      subtitle="Ce qui tombe à date fixe chaque mois."
      icon={Wallet}
      error={error}
      footer={
        <>
          <Button variant="ghost" onClick={onPrev}>
            Retour
          </Button>
          <Button onClick={onNext}>
            Vie Quotidienne <ArrowRight className="ml-2" size={18} />
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <AccordionSection
          mode="expert"
          defaultOpen={true}
          title="Revenus (Net)"
          icon={Banknote}
          colorClass="text-emerald-600"
          items={formData.incomes}
          onItemChange={(id, f, v) => updateItem!('incomes', id, f as string, v)}
          onItemAdd={() => addItem!('incomes')}
          onItemRemove={(id: string) => removeItem!('incomes', id)}
        />

        {formData.housing?.status !== HousingStatus.FREE && formData.housing?.status !== HousingStatus.OWNER_PAID && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-6">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Home size={16} className="text-indigo-500" />
              {formData.housing?.status === HousingStatus.TENANT ? 'Votre Loyer' : 'Votre Crédit Immo'}
            </h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <InputGroup
                  label="Montant Mensuel"
                  type="number"
                  placeholder="800"
                  value={formData.housing?.monthlyCost || ''}
                  onChange={(val: string) =>
                    updateForm({ ...formData, housing: { ...formData.housing, monthlyCost: parseNumber(val) } })
                  }
                  suffix="€"
                />
              </div>
              <div className="w-24">
                <InputGroup
                  label="Jour"
                  type="number"
                  placeholder="5"
                  value={formData.housing?.paymentDay || ''}
                  onChange={(val: string) =>
                    updateForm({ ...formData, housing: { ...formData.housing, paymentDay: parseNumber(val) } })
                  }
                />
              </div>
            </div>
          </div>
        )}

        <AccordionSection
          mode="expert"
          defaultOpen={false}
          title="Factures Fixes"
          icon={CreditCard}
          colorClass="text-slate-600"
          items={formData.fixedCosts}
          onItemChange={(id, f, v) => updateItem!('fixedCosts', id, f as string, v)}
          onItemAdd={() => addItem!('fixedCosts')}
          onItemRemove={(id: string) => removeItem!('fixedCosts', id)}
        />
        <AccordionSection
          mode="expert"
          defaultOpen={false}
          title="Abonnements"
          icon={Zap}
          colorClass="text-purple-500"
          items={formData.subscriptions}
          onItemChange={(id, f, v) => updateItem!('subscriptions', id, f as string, v)}
          onItemAdd={() => addItem!('subscriptions')}
          onItemRemove={(id: string) => removeItem!('subscriptions', id)}
        />
        <AccordionSection
          mode="expert"
          defaultOpen={false}
          title="Dépenses Annuelles"
          icon={Calendar}
          colorClass="text-orange-500"
          items={formData.annualExpenses}
          onItemChange={(id, f, v) => updateItem!('annualExpenses', id, f as string, v)}
          onItemAdd={() => addItem!('annualExpenses')}
          onItemRemove={(id: string) => removeItem!('annualExpenses', id)}
        />
        <AccordionSection
          mode="expert"
          defaultOpen={false}
          title="Crédits Conso"
          icon={AlertCircle}
          colorClass="text-rose-500"
          items={formData.credits}
          onItemChange={(id, f, v) => updateItem!('credits', id, f as string, v)}
          onItemAdd={() => addItem!('credits')}
          onItemRemove={(id: string) => removeItem!('credits', id)}
        />
      </div>
    </WizardLayout>
  );
}
