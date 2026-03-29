import Navigation from '@/app/components/Navigation';
import Header from '@/app/components/Header';
import { ToastProvider } from '@/app/components/ui/Toast';
import dynamic from 'next/dynamic';

const PushNotificationPrompt = dynamic(
  () => import('@/app/components/PushNotificationPrompt'),
  { ssr: false },
);
import ClientShell from '@/app/components/ClientShell';
import AppLoadingOverlay from '@/app/components/AppLoadingOverlay';
import { FinancialDataProvider } from '@/app/hooks/useFinancialData';
import { userService } from '@/app/services';
import { INITIAL_PROFILE } from '@/app/lib/definitions';
import { SignedIn } from '@clerk/nextjs';
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
          <SignedIn>
            <Navigation />
            <PushNotificationPrompt />
          </SignedIn>

          <main
            className={`min-h-screen transition-all duration-300 ${isConnected ? 'md:pl-64 pb-28 md:pb-0' : 'p-0'}`}
          >
            <div
              className={
                isConnected
                  ? 'w-full max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10'
                  : 'w-full h-full'
              }
            >
              <SignedIn>
                <Header />
              </SignedIn>

              <div
                className={
                  isConnected
                    ? 'mt-6 min-h-[32dvh] md:min-h-[38dvh]'
                    : ''
                }
              >
                {children}
              </div>
            </div>
          </main>
        </FinancialDataProvider>
      </ToastProvider>
    </ClientShell>
  );
}
