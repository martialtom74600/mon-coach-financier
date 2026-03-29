import dynamic from 'next/dynamic';
import { SignedIn } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import Navigation from '@/app/components/Navigation';
import Header from '@/app/components/Header';
import AppLoadingOverlay from '@/app/components/AppLoadingOverlay';
import { FinancialDataProvider } from '@/app/hooks/useFinancialData';
import { userService } from '@/app/services';
import { INITIAL_PROFILE } from '@/app/lib/definitions';

const PushNotificationPrompt = dynamic(
  () => import('@/app/components/PushNotificationPrompt'),
  { ssr: false },
);

/**
 * Application connectée : chrome complet. Ce layout n’est monté que pour les routes
 * sous (main), jamais pour `/sign-in` ou `/sign-up` — pas de contournement par pathname.
 */
export default async function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

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
    <FinancialDataProvider serverPreload={serverPreloadAwaited}>
      <AppLoadingOverlay />
      <SignedIn>
        <Navigation />
        <PushNotificationPrompt />
      </SignedIn>

      <main className="min-h-screen transition-all duration-300 md:pl-64 pb-28 md:pb-0">
        <div className="w-full max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10">
          <SignedIn>
            <Header />
          </SignedIn>

          <div className="mt-6 min-h-[32dvh] md:min-h-[38dvh]">{children}</div>
        </div>
      </main>
    </FinancialDataProvider>
  );
}
