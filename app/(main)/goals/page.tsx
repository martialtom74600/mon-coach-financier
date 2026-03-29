import dynamic from 'next/dynamic';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Target } from 'lucide-react';
import PageRouteSkeleton from '@/app/components/ui/PageRouteSkeleton';
import RoutePageHeader from '@/app/components/layout/RoutePageHeader';

const GoalsPageClient = dynamic(() => import('./GoalsPageClient'), {
  loading: () => <PageRouteSkeleton />,
});

export default async function GoalsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <>
      <RoutePageHeader
        leading={
          <div className="p-2.5 bg-emerald-100 rounded-xl" aria-hidden>
            <Target className="text-emerald-600" size={22} />
          </div>
        }
        title="Objectifs"
        subtitle="Planifie où tu veux aller et ajuste ton budget projet par projet."
      />
      <GoalsPageClient />
    </>
  );
}