import dynamic from 'next/dynamic';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { UserCircle } from 'lucide-react';
import PageRouteSkeleton from '@/app/components/ui/PageRouteSkeleton';
import RoutePageHeader from '@/app/components/layout/RoutePageHeader';

const ProfilePageClient = dynamic(() => import('./ProfilePageClient'), {
  loading: () => <PageRouteSkeleton />,
});

export default async function ProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <>
      <RoutePageHeader
        leading={
          <div className="p-2.5 bg-slate-200/80 rounded-xl" aria-hidden>
            <UserCircle className="text-slate-700" size={24} />
          </div>
        }
        title="Mon profil"
        subtitle="Ta situation, ton patrimoine et tes préférences."
      />
      <ProfilePageClient />
    </>
  );
}