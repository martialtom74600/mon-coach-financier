import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Settings } from 'lucide-react';
import { preferencesService, ServiceError } from '@/app/services';
import { getOrCreateProfileId } from '@/app/lib/server/getOrCreateProfileId';
import SettingsPageClient from './SettingsPageClient';
import RoutePageHeader from '@/app/components/layout/RoutePageHeader';

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const shell = (
    <>
      <RoutePageHeader
        leading={
          <div className="p-2.5 bg-indigo-100 rounded-xl" aria-hidden>
            <Settings className="text-indigo-600" size={24} />
          </div>
        }
        title="Ton jardin secret"
        subtitle="Notifications, emails et vie privée."
      />
    </>
  );

  try {
    const profileId = await getOrCreateProfileId(userId);
    const prefs = await preferencesService.getPreferences(profileId);
    return (
      <>
        {shell}
        <SettingsPageClient initialPrefs={prefs} />
      </>
    );
  } catch (error) {
    if (error instanceof ServiceError && error.status === 404) {
      return (
        <>
          {shell}
          <SettingsPageClient initialPrefs={null} />
        </>
      );
    }
    return (
      <>
        {shell}
        <SettingsPageClient />
      </>
    );
  }
}