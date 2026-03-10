'use client';

import { ShoppingCart, Car, HeartHandshake, User, Coffee, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import Button from '@/app/components/ui/Button';
import AccordionSection from '@/app/components/AccordionSection';
import { WizardLayout } from '../ProfileWizardLayout';
import { Frequency } from '@/app/lib/definitions';
import { generateIdHelper } from '../ProfileWizard.mappers';
import type { StepProps } from '../ProfileWizard.types';

export function StepDailyLife({
  formData,
  updateForm,
  addItem,
  removeItem,
  updateItem,
  onNext,
  onPrev,
  error,
  editMode,
  onSave,
  isSaving,
}: StepProps) {
  return (
    <WizardLayout
      title="Dépenses Courantes"
      subtitle="Tout ce qui est variable et lissé (Courses, Loisirs...)"
      icon={ShoppingCart}
      error={error}
      compact={editMode}
      footer={
        editMode && onSave ? (
          <Button onClick={() => onSave?.()} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? <Loader2 className="animate-spin" /> : 'Enregistrer'}
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onPrev}>
              Retour
            </Button>
            <Button onClick={onNext}>
              Patrimoine <ArrowRight className="ml-2" size={18} />
            </Button>
          </>
        )
      }
    >
      <div className="space-y-6">
        <div className="p-4 bg-yellow-50 rounded-xl text-sm text-yellow-800 mb-4 border border-yellow-100 flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <div>
            <span className="font-bold block mb-1">Pas de date nécessaire</span>
            Ces dépenses seront &quot;lissées&quot; sur tout le mois par notre algorithme (divisées par 30j) pour
            simuler une consommation réaliste.
          </div>
        </div>

        <AccordionSection
          mode="expert"
          hideDate={true}
          defaultOpen={true}
          title="Dépenses Courantes & Loisirs"
          icon={ShoppingCart}
          colorClass="text-indigo-600"
          items={formData.variableCosts}
          onItemChange={(id, f, v) => updateItem!('variableCosts', id, f as string, v)}
          onItemAdd={() => addItem!('variableCosts')}
          onItemRemove={(id: string) => removeItem!('variableCosts', id)}
        />

        <div className="grid grid-cols-2 gap-3 mt-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() =>
              updateForm({
                ...formData,
                variableCosts: [
                  ...formData.variableCosts,
                  { id: generateIdHelper(), name: 'Essence / Péage', amount: 0, frequency: Frequency.MONTHLY },
                ],
              })
            }
          >
            <Car className="mr-2" size={14} /> + Transport
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() =>
              updateForm({
                ...formData,
                variableCosts: [
                  ...formData.variableCosts,
                  { id: generateIdHelper(), name: 'Santé (Reste à charge)', amount: 0, frequency: Frequency.MONTHLY },
                ],
              })
            }
          >
            <HeartHandshake className="mr-2" size={14} /> + Santé
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() =>
              updateForm({
                ...formData,
                variableCosts: [
                  ...formData.variableCosts,
                  { id: generateIdHelper(), name: 'Animaux', amount: 0, frequency: Frequency.MONTHLY },
                ],
              })
            }
          >
            <User className="mr-2" size={14} /> + Animaux
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() =>
              updateForm({
                ...formData,
                variableCosts: [
                  ...formData.variableCosts,
                  { id: generateIdHelper(), name: 'Pause Dej / Cantine', amount: 0, frequency: Frequency.MONTHLY },
                ],
              })
            }
          >
            <Coffee className="mr-2" size={14} /> + Repas Midi
          </Button>
        </div>
      </div>
    </WizardLayout>
  );
}
