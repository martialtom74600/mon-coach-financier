import dynamic from 'next/dynamic';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { History } from 'lucide-react';
import PageRouteSkeleton from '@/app/components/ui/PageRouteSkeleton';
import RoutePageHeader from '@/app/components/layout/RoutePageHeader';

const HistoryPageClient = dynamic(() => import('./HistoryPageClient'), {
  loading: () => <PageRouteSkeleton />,
});

export default async function HistoryPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <>
      <RoutePageHeader
        leading={
          <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600 border border-slate-100" aria-hidden>
            <History size={20} />
          </div>
        }
        title="Ta vision"
        subtitle="Calendrier, liste et bilan de tes simulations d'achat."
      />
      <HistoryPageClient />
    </>
  );
}