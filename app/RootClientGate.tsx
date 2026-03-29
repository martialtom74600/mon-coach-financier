import { auth } from '@clerk/nextjs/server';
import ClientShell from '@/app/components/ClientShell';
import { ToastProvider } from '@/app/components/ui/Toast';

/**
 * Gate client commun (session Clerk + toasts).
 * Le chrome lourd (nav, profil, FinancialDataProvider) vit uniquement dans `app/(main)/layout.tsx`.
 */
export default async function RootClientGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  return (
    <ClientShell trustServerSession={!!userId}>
      <ToastProvider>{children}</ToastProvider>
    </ClientShell>
  );
}
