'use client';

import { Briefcase, Target, GraduationCap, Armchair, Building, Home, CheckCircle, HeartHandshake, ArrowRight } from 'lucide-react';
import Button from '@/app/components/ui/Button';
import { WizardLayout, SelectionTile, CounterControl } from '../ProfileWizardLayout';
import { UserPersona, HousingStatus } from '@/app/lib/definitions';
import type { StepProps } from '../ProfileWizard.types';

export function StepSituation({ formData, updateForm, onNext, onPrev, error }: StepProps) {
  return (
    <WizardLayout
      title="Votre Situation"
      subtitle="Adaptons la stratégie à votre profil."
      icon={Briefcase}
      error={error}
      footer={
        <>
          <Button variant="ghost" onClick={onPrev}>
            Retour
          </Button>
          <Button onClick={onNext}>
            Continuer <ArrowRight className="ml-2" size={18} />
          </Button>
        </>
      }
    >
      <div className="space-y-8">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Statut Pro</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SelectionTile
              icon={Briefcase}
              title="Salarié"
              desc="CDI / CDD"
              selected={formData.persona === UserPersona.SALARIED}
              onClick={() => updateForm({ ...formData, persona: UserPersona.SALARIED })}
            />
            <SelectionTile
              icon={Target}
              title="Indépendant"
              desc="Freelance"
              selected={formData.persona === UserPersona.FREELANCE}
              onClick={() => updateForm({ ...formData, persona: UserPersona.FREELANCE })}
            />
            <SelectionTile
              icon={GraduationCap}
              title="Étudiant"
              desc="Études"
              selected={formData.persona === UserPersona.STUDENT}
              onClick={() => updateForm({ ...formData, persona: UserPersona.STUDENT })}
            />
            <SelectionTile
              icon={Armchair}
              title="Retraité"
              desc="Pension"
              selected={formData.persona === UserPersona.RETIRED}
              onClick={() => updateForm({ ...formData, persona: UserPersona.RETIRED })}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Logement</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SelectionTile
              icon={Building}
              title="Locataire"
              desc="Loyer"
              selected={formData.housing?.status === HousingStatus.TENANT}
              onClick={() => updateForm({ ...formData, housing: { ...formData.housing, status: HousingStatus.TENANT } })}
            />
            <SelectionTile
              icon={Home}
              title="Propriétaire"
              desc="Crédit"
              selected={formData.housing?.status === HousingStatus.OWNER_LOAN}
              onClick={() =>
                updateForm({ ...formData, housing: { ...formData.housing, status: HousingStatus.OWNER_LOAN } })
              }
            />
            <SelectionTile
              icon={CheckCircle}
              title="Propriétaire"
              desc="Payé"
              selected={formData.housing?.status === HousingStatus.OWNER_PAID}
              onClick={() =>
                updateForm({
                  ...formData,
                  housing: { ...formData.housing, status: HousingStatus.OWNER_PAID, monthlyCost: 0 },
                })
              }
            />
            <SelectionTile
              icon={HeartHandshake}
              title="Gratuit"
              desc="Hébergé"
              selected={formData.housing?.status === HousingStatus.FREE}
              onClick={() =>
                updateForm({
                  ...formData,
                  housing: { ...formData.housing, status: HousingStatus.FREE, monthlyCost: 0 },
                })
              }
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Foyer</label>
          <div className="flex gap-4">
            <CounterControl
              label="Adultes"
              value={formData.household?.adults || 1}
              onChange={(v: number) => updateForm({ ...formData, household: { ...formData.household, adults: v } })}
            />
            <CounterControl
              label="Enfants"
              value={formData.household?.children || 0}
              onChange={(v: number) => updateForm({ ...formData, household: { ...formData.household, children: v } })}
            />
          </div>
        </div>
      </div>
    </WizardLayout>
  );
}
