'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import ProfileWizard from '@/app/components/profile/ProfileWizard';
import ProfileView, { isProfileComplete } from '@/app/components/profile/ProfileView';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import PageLoader from '@/app/components/ui/PageLoader';

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const editMode = searchParams.get('edit') === '1';
  const { profile, isLoaded, refreshData } = useFinancialData();

  if (!isLoaded) {
    return <PageLoader />;
  }

  const complete = isProfileComplete(profile);

  if (editMode || !complete) {
    return <ProfileWizard />;
  }

  return (
    <ProfileView
      profile={profile!}
      refreshData={refreshData}
    />
  );
}
