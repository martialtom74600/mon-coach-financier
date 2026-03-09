import { Suspense } from 'react';
import { auth, currentUser } from '@clerk/nextjs/server';
import { userService } from '@/app/services';
import DashboardClient from '@/app/components/DashboardClient';
import AuthScreen from '@/app/components/AuthScreen';

export default async function Home() {
  const { userId } = await auth();
  if (!userId) {
    return (
      <Suspense fallback={<div className="h-screen bg-white"></div>}>
        <AuthScreen />
      </Suspense>
    );
  }

  const [profileRaw, user] = await Promise.all([
    userService.getCachedProfile(userId),
    currentUser(),
  ]);

  const profile = userService.buildProfileForClient(profileRaw);

  return (
    <DashboardClient
      profile={profile}
      firstName={user?.firstName}
    />
  );
}
