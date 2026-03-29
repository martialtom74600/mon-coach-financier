import { ToastProvider } from '@/app/components/ui/Toast';
import AppChromeFrame from '@/app/components/AppChromeFrame';
import ClientShell from '@/app/components/ClientShell';
import AppLoadingOverlay from '@/app/components/AppLoadingOverlay';
import { FinancialDataProvider } from '@/app/hooks/useFinancialData';
import { userService } from '@/app/services';
import { INITIAL_PROFILE } from '@/app/lib/definitions';
import { auth } from '@clerk/nextjs/server';

export default async function RootLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  const isConnected = !!userId;

  const serverPreloadAwaited =
    userId != null
      ? await userService.getCachedProfile(userId).then((r) => {
          const built = userService.buildProfileForClient(r);
          const profile = built ?? { ...INITIAL_PROFILE };
          return {
            userId,
            profile: JSON.parse(JSON.stringify(profile)) as typeof profile,
          };
        })
      : null;

  return (
    <ClientShell trustServerSession={isConnected}>
      <ToastProvider>
        <FinancialDataProvider serverPreload={serverPreloadAwaited}>
          <AppLoadingOverlay />
          <AppChromeFrame isConnected={isConnected}>{children}</AppChromeFrame>
        </FinancialDataProvider>
      </ToastProvider>
    </ClientShell>
  );
}
