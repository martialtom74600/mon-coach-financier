'use client';

import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import { Profile } from '@/app/lib/definitions';
import ProfileEmptyPrompt from '@/app/components/ui/ProfileEmptyPrompt';

export default function DashboardWelcomeGate({
  profile,
  firstName,
}: {
  profile: Profile | null;
  firstName?: string | null;
}) {
  const router = useRouter();

  if (!profile) {
    return (
      <ProfileEmptyPrompt
        variant="full"
        title={`Bonjour, ${firstName || ''}.`}
        message="Pour construire ton GPS financier, on doit d'abord comprendre ton point de départ."
        buttonLabel="Lancer l'analyse"
        onAction={() => router.push('/profile')}
        icon={Zap}
      />
    );
  }

  return (
    <ProfileEmptyPrompt
      variant="full"
      title={`Bonjour, ${profile.firstName || firstName || ''}.`}
      message="Pour construire ton GPS financier, on doit d'abord comprendre ton point de départ."
      buttonLabel="Lancer l'analyse"
      onAction={() => router.push('/profile')}
      icon={Zap}
    />
  );
}
