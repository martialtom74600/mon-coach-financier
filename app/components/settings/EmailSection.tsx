'use client';

import React from 'react';
import { Mail } from 'lucide-react';
import ContextToggle from '@/app/components/ui/ContextToggle';

export interface EmailSectionProps {
  emailAlerts: boolean;
  emailNewsletter: boolean;
  onEmailAlertsChange: (enabled: boolean) => void;
  onEmailNewsletterChange: (enabled: boolean) => void;
  saving?: boolean;
}

export default function EmailSection({
  emailAlerts,
  emailNewsletter,
  onEmailAlertsChange,
  onEmailNewsletterChange,
}: EmailSectionProps) {
  return (
    <div className="space-y-3">
      <ContextToggle
        label="Alertes par email"
        subLabel="Recevez les alertes importantes (solde bas, prélèvements à venir)"
        icon={Mail}
        checked={emailAlerts}
        onChange={onEmailAlertsChange}
        variant="indigo"
      />
      <ContextToggle
        label="Newsletter"
        subLabel="Conseils et astuces pour optimiser votre budget"
        icon={Mail}
        checked={emailNewsletter}
        onChange={onEmailNewsletterChange}
        variant="indigo"
      />
    </div>
  );
}
