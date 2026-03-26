'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Settings } from 'lucide-react';
import GlassCard from '@/app/components/ui/GlassCard';
import PageLoader from '@/app/components/ui/PageLoader';
import NotificationSection from '@/app/components/settings/NotificationSection';
import EmailSection from '@/app/components/settings/EmailSection';
import RgpdSection from '@/app/components/settings/RgpdSection';
import { useToast } from '@/app/components/ui/Toast';

interface Preferences {
  id: string;
  pushEnabled: boolean;
  emailAlerts: boolean;
  emailNewsletter: boolean;
  consentAnalytics: boolean;
  consentMarketing: boolean;
  consentUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const { showToast } = useToast();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace('/sign-in');
      return;
    }

    const fetchPrefs = async () => {
      try {
        const res = await fetch('/api/preferences');
        if (!res.ok) {
          if (res.status === 401) {
            router.replace('/sign-in');
            return;
          }
          if (res.status === 404) {
            setPrefs(null);
            setLoading(false);
            return;
          }
          throw new Error('Oups, petit bug. Réessaie ?');
        }
        const data = await res.json();
        setPrefs(data);
      } catch {
        showToast('On n\'arrive pas à charger tes réglages. Rafraîchis ?', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchPrefs();
  }, [isLoaded, isSignedIn, showToast, router]);

  const updatePref = async (updates: Partial<Preferences>) => {
    if (!prefs) return;
    setSaving(true);
    try {
      const res = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Oups, petit bug. Réessaie ?');
      const data = await res.json();
      setPrefs(data);
      showToast('C\'est enregistré !', 'success');
    } catch {
      showToast('Oups, ça n\'a pas marché. Réessaie ?', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded || loading) {
    return <PageLoader />;
  }

  if (!prefs) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-600 mb-4">
          Complète ton profil pour accéder aux réglages.
        </p>
        <a
          href="/profile"
          className="text-indigo-600 font-medium hover:underline"
        >
          Aller au profil →
        </a>
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in pb-20 md:pb-0">
      <div className="mb-8 flex items-center gap-3">
        <div className="p-2.5 bg-indigo-100 rounded-xl">
          <Settings className="text-indigo-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ton jardin secret</h1>
          <p className="text-sm text-slate-500">
            Notifications, emails et vie privée
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <GlassCard>
        <h2 className="text-lg font-bold text-slate-800 mb-4">Notifications</h2>
        <NotificationSection
          pushEnabled={prefs.pushEnabled}
          onPushChange={(v) => updatePref({ pushEnabled: v })}
          saving={saving}
        />
      </GlassCard>

      <GlassCard>
        <h2 className="text-lg font-bold text-slate-800 mb-4">Emails</h2>
        <EmailSection
          emailAlerts={prefs.emailAlerts}
          emailNewsletter={prefs.emailNewsletter}
          onEmailAlertsChange={(v) => updatePref({ emailAlerts: v })}
          onEmailNewsletterChange={(v) => updatePref({ emailNewsletter: v })}
          saving={saving}
        />
      </GlassCard>

      <GlassCard>
        <h2 className="text-lg font-bold text-slate-800 mb-4">
          Données & vie privée
        </h2>
        <RgpdSection
          consentAnalytics={prefs.consentAnalytics}
          consentMarketing={prefs.consentMarketing}
          onConsentAnalyticsChange={(v) => updatePref({ consentAnalytics: v })}
          onConsentMarketingChange={(v) => updatePref({ consentMarketing: v })}
          saving={saving}
        />
      </GlassCard>
      </div>
    </div>
  );
}
