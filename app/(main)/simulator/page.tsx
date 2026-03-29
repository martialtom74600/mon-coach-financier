import dynamic from 'next/dynamic';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import PageRouteSkeleton from '@/app/components/ui/PageRouteSkeleton';
import RoutePageHeader from '@/app/components/layout/RoutePageHeader';

const SimulatorPageClient = dynamic(() => import('./SimulatorPageClient'), {
  loading: () => <PageRouteSkeleton />,
});

export default async function SimulatorPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <>
      <RoutePageHeader
        leading={
          <div className="p-2.5 bg-indigo-100 rounded-xl" aria-hidden>
            <ShoppingBag className="text-indigo-600" size={22} />
          </div>
        }
        title="Simulateur d'achat"
        subtitle="Cet achat, il rentre dans ton budget sans casser tes objectifs ?"
      />
      <SimulatorPageClient />
    </>
  );
}