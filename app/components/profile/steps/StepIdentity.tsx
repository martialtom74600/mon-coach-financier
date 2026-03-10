'use client';

import { User, ArrowRight, Loader2 } from 'lucide-react';
import InputGroup from '@/app/components/ui/InputGroup';
import Button from '@/app/components/ui/Button';
import { WizardLayout } from '../ProfileWizardLayout';
import type { StepProps } from '../ProfileWizard.types';

export function StepIdentity({ formData, updateForm, onNext, error, editMode, onSave, isSaving }: StepProps) {
  return (
    <WizardLayout
      title="C'est qui, toi ?"
      subtitle="On en a besoin pour te donner des chiffres qui collent à ta vie."
      icon={User}
      error={error}
      compact={editMode}
      footer={
        editMode && onSave ? (
          <Button onClick={() => onSave?.()} className="w-full" size="lg" disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : 'C\'est bon'}
          </Button>
        ) : (
          <Button onClick={onNext} className="w-full" size="lg">
            C&apos;est parti ! <ArrowRight className="ml-2" size={18} />
          </Button>
        )
      }
    >
      <div className="space-y-6">
        <InputGroup
          label="Ton prénom"
          placeholder="Ex: Thomas"
          value={formData.firstName || ''}
          onChange={(val: string) => updateForm({ ...formData, firstName: val })}
        />
        <div className={`transition-opacity duration-500 ${formData.firstName ? 'opacity-100' : 'opacity-30'}`}>
          <InputGroup
            label="Ton âge"
            type="number"
            placeholder="30"
            value={formData.age || ''}
            onChange={(val: string) => updateForm({ ...formData, age: val as unknown as number })}
          />
        </div>
      </div>
    </WizardLayout>
  );
}
