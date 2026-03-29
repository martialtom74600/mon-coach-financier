'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import PageLoader from '@/app/components/ui/PageLoader';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import { isProfileComplete } from '@/app/lib/profileCompleteness';

const ProfileWizard = dynamic(() => import('@/app/components/profile/ProfileWizard'), {
  loading: () => <PageLoader />,
});

const ProfileView = dynamic(() => import('@/app/components/profile/ProfileView'), {
  loading: () => <PageLoader />,
});

export default function ProfilePageClient() {
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

  return <ProfileView profile={profile!} refreshData={refreshData} />;
}
