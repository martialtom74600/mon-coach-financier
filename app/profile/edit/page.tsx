import { Suspense } from 'react';
import PageLoader from '@/app/components/ui/PageLoader';
import ProfileEditClient from './ProfileEditClient';

export default function ProfileEditPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProfileEditClient />
    </Suspense>
  );
}
